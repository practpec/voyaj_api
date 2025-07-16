// src/modules/trips/application/useCases/InviteUserToTrip.ts
import { TripMember, TripMemberRole } from '../../domain/TripMember';
import { ITripRepository } from '../../domain/interfaces/ITripRepository';
import { ITripMemberRepository } from '../../domain/interfaces/ITripMemberRepository';
import { IUserRepository } from '../../../users/domain/interfaces/IUserRepository';
import { TripService } from '../../domain/TripService';
import { EventBus } from '../../../../shared/events/EventBus';
import { TripEvents } from '../../domain/TripEvents';
import { InviteMemberDTO, TripMemberResponseDTO, TripMemberDTOMapper } from '../dtos/TripMemberDTO';

export class InviteUserToTripUseCase {
  constructor(
    private tripRepository: ITripRepository,
    private tripMemberRepository: ITripMemberRepository,
    private userRepository: IUserRepository,
    private tripService: TripService,
    private eventBus: EventBus
  ) {}

  public async execute(
    tripId: string, 
    inviterId: string, 
    dto: InviteMemberDTO
  ): Promise<TripMemberResponseDTO> {
    // Validar DTO
    const validationErrors = TripMemberDTOMapper.validateInviteDTO(dto);
    if (validationErrors.length > 0) {
      throw new Error(`Datos inválidos: ${validationErrors.join(', ')}`);
    }

    // Validar invitación
    await this.tripService.validateMemberInvitation(tripId, inviterId, dto.userId);

    // Obtener información del viaje
    const trip = await this.tripRepository.findById(tripId);
    if (!trip) {
      throw new Error('Viaje no encontrado');
    }

    // Obtener información del usuario invitado
    const invitedUser = await this.userRepository.findById(dto.userId);
    if (!invitedUser) {
      throw new Error('Usuario invitado no encontrado');
    }

    // Obtener información del invitador
    const inviter = await this.userRepository.findById(inviterId);
    if (!inviter) {
      throw new Error('Usuario invitador no encontrado');
    }

    // Verificar si ya existe una invitación previa rechazada
    const existingMember = await this.tripMemberRepository.findByTripAndUser(tripId, dto.userId);
    if (existingMember) {
      if (existingMember.isPending()) {
        throw new Error('Este usuario ya tiene una invitación pendiente');
      }
      if (existingMember.isAccepted()) {
        throw new Error('Este usuario ya es miembro del viaje');
      }
      // Si fue rechazada previamente, crear nueva invitación
      await this.tripMemberRepository.delete(existingMember.id);
    }

    // Crear la invitación
    const tripMember = new TripMember({
      tripId,
      userId: dto.userId,
      role: (dto.role as TripMemberRole) || TripMemberRole.MEMBER,
      invitedBy: inviterId,
      permissions: dto.permissions
    });

    await this.tripMemberRepository.create(tripMember);

    // Emitir evento
    const event = TripEvents.createMemberInvitedEvent(
      tripMember,
      invitedUser.email,
      `${inviter.firstName} ${inviter.lastName}`,
      trip.title
    );
    await this.eventBus.publish(event);

    // Preparar respuesta
    const userInfo = {
      firstName: invitedUser.firstName,
      lastName: invitedUser.lastName,
      email: invitedUser.email,
      avatar: invitedUser.avatar
    };

    const inviterInfo = {
      firstName: inviter.firstName,
      lastName: inviter.lastName
    };

    return TripMemberDTOMapper.toResponseDTO(tripMember, userInfo, inviterInfo);
  }
}