// src/modules/trips/infrastructure/events/TripEventHandlers.ts
import { EventBus } from '../../../../shared/events/EventBus';
import { TRIP_EVENT_TYPES, TripEvent } from '../../domain/TripEvents';
import { EmailService } from '../../../../shared/services/EmailService';
import { NotificationService } from '../../../../shared/services/NotificationService';
import { IUserRepository } from '../../../users/domain/interfaces/IUserRepository';

export class TripEventHandlers {
  constructor(
    private eventBus: EventBus,
    private emailService: EmailService,
    private notificationService: NotificationService,
    private userRepository: IUserRepository
  ) {
    this.registerEventHandlers();
  }

  private registerEventHandlers(): void {
    // Evento de viaje creado
    this.eventBus.subscribe(TRIP_EVENT_TYPES.TRIP_CREATED, async (event: TripEvent) => {
      await this.handleTripCreated(event as any);
    });

    // Evento de miembro invitado
    this.eventBus.subscribe(TRIP_EVENT_TYPES.MEMBER_INVITED, async (event: TripEvent) => {
      await this.handleMemberInvited(event as any);
    });

    // Evento de invitación aceptada
    this.eventBus.subscribe(TRIP_EVENT_TYPES.INVITATION_ACCEPTED, async (event: TripEvent) => {
      await this.handleInvitationAccepted(event as any);
    });

    // Evento de invitación rechazada
    this.eventBus.subscribe(TRIP_EVENT_TYPES.INVITATION_REJECTED, async (event: TripEvent) => {
      await this.handleInvitationRejected(event as any);
    });

    // Evento de miembro que salió
    this.eventBus.subscribe(TRIP_EVENT_TYPES.MEMBER_LEFT, async (event: TripEvent) => {
      await this.handleMemberLeft(event as any);
    });

    // Evento de miembro removido
    this.eventBus.subscribe(TRIP_EVENT_TYPES.MEMBER_REMOVED, async (event: TripEvent) => {
      await this.handleMemberRemoved(event as any);
    });

    // Evento de viaje completado
    this.eventBus.subscribe(TRIP_EVENT_TYPES.TRIP_COMPLETED, async (event: TripEvent) => {
      await this.handleTripCompleted(event as any);
    });

    // Evento de cambio de rol
    this.eventBus.subscribe(TRIP_EVENT_TYPES.MEMBER_ROLE_CHANGED, async (event: TripEvent) => {
      await this.handleMemberRoleChanged(event as any);
    });
  }

  private async handleTripCreated(event: any): Promise<void> {
    try {
      const { trip, isGroupTrip } = event.data;
      
      // Crear notificación para el creador
      await this.notificationService.create({
        userId: event.userId,
        type: 'trip_created',
        title: 'Viaje creado exitosamente',
        message: `Tu viaje "${trip.title}" ha sido creado`,
        data: {
          tripId: trip.id,
          tripTitle: trip.title
        }
      });

      // Si es viaje grupal, enviar email de confirmación
      if (isGroupTrip) {
        const user = await this.userRepository.findById(event.userId);
        if (user) {
          await this.emailService.sendTripCreatedEmail(user.email, {
            userName: `${user.firstName} ${user.lastName}`,
            tripTitle: trip.title,
            tripDestination: trip.destination,
            startDate: trip.startDate,
            endDate: trip.endDate
          });
        }
      }
    } catch (error) {
      console.error('Error manejando evento de viaje creado:', error);
    }
  }

  private async handleMemberInvited(event: any): Promise<void> {
    try {
      const { tripMember, invitedUserEmail, inviterName, tripTitle } = event.data;

      // Enviar email de invitación
      await this.emailService.sendTripInvitationEmail(invitedUserEmail, {
        inviterName,
        tripTitle,
        invitationId: tripMember.id,
        acceptUrl: `${process.env.FRONTEND_URL}/trips/${tripMember.tripId}/invitation/accept`,
        rejectUrl: `${process.env.FRONTEND_URL}/trips/${tripMember.tripId}/invitation/reject`
      });

      // Crear notificación para el usuario invitado
      await this.notificationService.create({
        userId: tripMember.userId,
        type: 'trip_invitation',
        title: 'Nueva invitación de viaje',
        message: `${inviterName} te ha invitado al viaje "${tripTitle}"`,
        data: {
          tripId: tripMember.tripId,
          tripTitle,
          inviterName,
          invitationId: tripMember.id
        }
      });

    } catch (error) {
      console.error('Error manejando evento de miembro invitado:', error);
    }
  }

  private async handleInvitationAccepted(event: any): Promise<void> {
    try {
      const { tripMember, memberName, tripTitle } = event.data;

      // Notificar al organizador y otros miembros
      const tripOwner = await this.userRepository.findById(tripMember.invitedBy);
      if (tripOwner) {
        await this.notificationService.create({
          userId: tripOwner.id,
          type: 'invitation_accepted',
          title: 'Invitación aceptada',
          message: `${memberName} se ha unido al viaje "${tripTitle}"`,
          data: {
            tripId: tripMember.tripId,
            tripTitle,
            newMemberName: memberName
          }
        });

        // Enviar email de confirmación
        await this.emailService.sendInvitationAcceptedEmail(tripOwner.email, {
          organizerName: `${tripOwner.firstName} ${tripOwner.lastName}`,
          memberName,
          tripTitle
        });
      }

    } catch (error) {
      console.error('Error manejando evento de invitación aceptada:', error);
    }
  }

  private async handleInvitationRejected(event: any): Promise<void> {
    try {
      const { tripMember, rejectedUserName, tripTitle, reason } = event.data;

      // Notificar al organizador
      if (tripMember.invitedBy) {
        const tripOwner = await this.userRepository.findById(tripMember.invitedBy);
        if (tripOwner) {
          await this.notificationService.create({
            userId: tripOwner.id,
            type: 'invitation_rejected',
            title: 'Invitación rechazada',
            message: `${rejectedUserName} ha rechazado la invitación al viaje "${tripTitle}"`,
            data: {
              tripId: tripMember.tripId,
              tripTitle,
              rejectedUserName,
              reason
            }
          });
        }
      }

    } catch (error) {
      console.error('Error manejando evento de invitación rechazada:', error);
    }
  }

  private async handleMemberLeft(event: any): Promise<void> {
    try {
      const { tripMember, memberName, tripTitle } = event.data;

      // Notificar a otros miembros del viaje
      // Esto requeriría obtener todos los miembros activos del viaje
      // Por simplicidad, solo notificamos al organizador por ahora
      
      await this.notificationService.create({
        userId: tripMember.invitedBy || event.userId,
        type: 'member_left',
        title: 'Miembro salió del viaje',
        message: `${memberName} ha salido del viaje "${tripTitle}"`,
        data: {
          tripId: tripMember.tripId,
          tripTitle,
          memberName
        }
      });

    } catch (error) {
      console.error('Error manejando evento de miembro que salió:', error);
    }
  }

  private async handleMemberRemoved(event: any): Promise<void> {
    try {
      const { tripMember, removedMemberName, removedByName, tripTitle, reason } = event.data;

      // Notificar al usuario removido
      await this.notificationService.create({
        userId: tripMember.userId,
        type: 'member_removed',
        title: 'Removido del viaje',
        message: `Has sido removido del viaje "${tripTitle}" por ${removedByName}`,
        data: {
          tripId: tripMember.tripId,
          tripTitle,
          removedBy: removedByName,
          reason
        }
      });

      // Enviar email de notificación
      const removedUser = await this.userRepository.findById(tripMember.userId);
      if (removedUser) {
        await this.emailService.sendMemberRemovedEmail(removedUser.email, {
          userName: `${removedUser.firstName} ${removedUser.lastName}`,
          tripTitle,
          removedBy: removedByName,
          reason
        });
      }

    } catch (error) {
      console.error('Error manejando evento de miembro removido:', error);
    }
  }

  private async handleTripCompleted(event: any): Promise<void> {
    try {
      const { trip, totalExpenses, memberCount, duration } = event.data;

      // Crear notificación de felicitación
      await this.notificationService.create({
        userId: event.userId,
        type: 'trip_completed',
        title: 'Viaje completado',
        message: `¡Felicidades! Has completado tu viaje "${trip.title}"`,
        data: {
          tripId: trip.id,
          tripTitle: trip.title,
          totalExpenses,
          duration
        }
      });

      // Enviar email de resumen del viaje
      const user = await this.userRepository.findById(event.userId);
      if (user) {
        await this.emailService.sendTripCompletedEmail(user.email, {
          userName: `${user.firstName} ${user.lastName}`,
          tripTitle: trip.title,
          destination: trip.destination,
          duration,
          totalExpenses,
          memberCount,
          startDate: trip.startDate,
          endDate: trip.endDate
        });
      }

    } catch (error) {
      console.error('Error manejando evento de viaje completado:', error);
    }
  }

  private async handleMemberRoleChanged(event: any): Promise<void> {
    try {
      const { tripMember, previousRole, newRole, changedByName, memberName, tripTitle } = event.data;

      // Notificar al miembro cuyo rol cambió
      await this.notificationService.create({
        userId: tripMember.userId,
        type: 'role_changed',
        title: 'Rol actualizado en viaje',
        message: `Tu rol en "${tripTitle}" ha cambiado de ${previousRole} a ${newRole}`,
        data: {
          tripId: tripMember.tripId,
          tripTitle,
          previousRole,
          newRole,
          changedBy: changedByName
        }
      });

    } catch (error) {
      console.error('Error manejando evento de cambio de rol:', error);
    }
  }
}