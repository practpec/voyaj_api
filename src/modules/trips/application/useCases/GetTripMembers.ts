// src/modules/trips/application/useCases/GetTripMembers.ts
import { ITripMemberRepository } from '../../domain/interfaces/ITripMemberRepository';
import { IUserRepository } from '../../../users/domain/interfaces/IUserRepository';
import { TripService } from '../../domain/TripService';
import { TripMemberFiltersDTO, TripMemberListResponseDTO, TripMemberDTOMapper } from '../dtos/TripMemberDTO';

export class GetTripMembersUseCase {
  constructor(
    private tripMemberRepository: ITripMemberRepository,
    private userRepository: IUserRepository,
    private tripService: TripService
  ) {}

  public async execute(
    tripId: string,
    requesterId: string,
    filters?: TripMemberFiltersDTO
  ): Promise<TripMemberListResponseDTO> {
    // Verificar que el usuario puede acceder al viaje
    const canAccess = await this.tripService.canUserAccessTrip(tripId, requesterId);
    if (!canAccess) {
      throw new Error('No tienes permisos para ver los miembros de este viaje');
    }

    // Configurar filtros
    const searchFilters = {
      tripId,
      role: filters?.role,
      status: filters?.status,
      isActive: filters?.isActive,
      limit: filters?.limit || 50,
      offset: filters?.offset || 0
    };

    // Obtener miembros
    const members = await this.tripMemberRepository.findWithFilters(searchFilters);
    const total = await this.tripMemberRepository.countByFilters(searchFilters);

    // Obtener conteos adicionales
    const activeMembers = await this.tripMemberRepository.countActiveMembersByTripId(tripId);
    const pendingInvitations = await this.tripMemberRepository.countPendingMembersByTripId(tripId);

    // Enriquecer con información de usuarios
    const enrichedMembers = await Promise.all(
      members.map(async (member) => {
        // Obtener información del usuario
        const user = await this.userRepository.findById(member.userId);
        const userInfo = user ? {
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          avatar: user.avatar
        } : undefined;

        // Obtener información del invitador si existe
        let inviterInfo;
        if (member.invitedBy) {
          const inviter = await this.userRepository.findById(member.invitedBy);
          if (inviter) {
            inviterInfo = {
              firstName: inviter.firstName,
              lastName: inviter.lastName
            };
          }
        }

        return TripMemberDTOMapper.toResponseDTO(member, userInfo, inviterInfo);
      })
    );

    return TripMemberDTOMapper.toListResponseDTO(
      enrichedMembers,
      total,
      activeMembers,
      pendingInvitations
    );
  }
}