// src/modules/trips/application/useCases/HandleTripInvitation.ts
import { ITripRepository } from '../../domain/interfaces/ITripRepository';
import { ITripMemberRepository } from '../../domain/interfaces/ITripMemberRepository';
import { IUserRepository } from '../../../users/domain/interfaces/IUserRepository';
import { EventBus } from '../../../../shared/events/EventBus';
import { TripEvents } from '../../domain/TripEvents';
import { HandleInvitationDTO, TripMemberResponseDTO, TripMemberDTOMapper } from '../dtos/TripMemberDTO';

export class HandleTripInvitationUseCase {
  constructor(
    private tripRepository: ITripRepository,
    private tripMemberRepository: ITripMemberRepository,
    private userRepository: IUserRepository,
    private eventBus: EventBus
  ) {}

  public async execute(
    tripId: string, 
    userId: string, 
    dto: HandleInvitationDTO
  ): Promise<TripMemberResponseDTO> {
    // Validar DTO
    const validationErrors = TripMemberDTOMapper.validateHandleInvitationDTO(dto);
    if (validationErrors.length > 0) {
      throw new Error(`Datos inválidos: ${validationErrors.join(', ')}`);
    }

    // Buscar la invitación
    const tripMember = await this.tripMemberRepository.findByTripAndUser(tripId, userId);
    if (!tripMember) {
      throw new Error('Invitación no encontrada');
    }

    if (!tripMember.isPending()) {
      throw new Error('Esta invitación ya fue procesada');
    }

    // Obtener información del viaje
    const trip = await this.tripRepository.findById(tripId);
    if (!trip) {
      throw new Error('Viaje no encontrado');
    }

    if (trip.isDeleted) {
      throw new Error('Este viaje ya no está disponible');
    }

    // Obtener información del usuario
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new Error('Usuario no encontrado');
    }

    // Procesar la respuesta
    if (dto.action === 'accept') {
      tripMember.accept();
      
      // Emitir evento de aceptación
      const acceptedEvent = TripEvents.createInvitationAcceptedEvent(
        tripMember,
        `${user.firstName} ${user.lastName}`,
        trip.title
      );
      await this.eventBus.publish(acceptedEvent);
      
    } else if (dto.action === 'reject') {
      tripMember.reject();
      
      // Emitir evento de rechazo
      const rejectedEvent = TripEvents.createInvitationRejectedEvent(
        tripMember,
        `${user.firstName} ${user.lastName}`,
        trip.title,
        dto.reason
      );
      await this.eventBus.publish(rejectedEvent);
    }

    // Guardar cambios
    await this.tripMemberRepository.update(tripMember);

    // Preparar respuesta
    const userInfo = {
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      avatar: user.avatar
    };

    // Obtener información del invitador si existe
    let inviterInfo;
    if (tripMember.invitedBy) {
      const inviter = await this.userRepository.findById(tripMember.invitedBy);
      if (inviter) {
        inviterInfo = {
          firstName: inviter.firstName,
          lastName: inviter.lastName
        };
      }
    }

    return TripMemberDTOMapper.toResponseDTO(tripMember, userInfo, inviterInfo);
  }
}