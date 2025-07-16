// src/modules/trips/application/useCases/ExportTrip.ts
import { ITripRepository } from '../../domain/interfaces/ITripRepository';
import { ITripMemberRepository } from '../../domain/interfaces/ITripMemberRepository';
import { IUserRepository } from '../../../users/domain/interfaces/IUserRepository';
import { TripService } from '../../domain/TripService';
import { TripExportService } from '../../infrastructure/services/TripExportService';
import { ExportTripDTO, ExportTripResponseDTO, TripInvitationDTOMapper } from '../dtos/TripInvitationDTO';

export class ExportTripUseCase {
  constructor(
    private tripRepository: ITripRepository,
    private tripMemberRepository: ITripMemberRepository,
    private userRepository: IUserRepository,
    private tripService: TripService,
    private tripExportService: TripExportService
  ) {}

  public async execute(
    tripId: string,
    userId: string,
    dto: ExportTripDTO
  ): Promise<ExportTripResponseDTO> {
    // Validar DTO
    const validationErrors = TripInvitationDTOMapper.validateExportDTO(dto);
    if (validationErrors.length > 0) {
      throw new Error(`Datos inválidos: ${validationErrors.join(', ')}`);
    }

    // Validar permisos de exportación
    await this.tripService.validateTripExport(tripId, userId);

    // Obtener el viaje
    const trip = await this.tripRepository.findById(tripId);
    if (!trip) {
      throw new Error('Viaje no encontrado');
    }

    // Obtener datos base del viaje
    const exportData: any = {
      trip: {
        id: trip.id,
        title: trip.title,
        destination: trip.destination,
        description: trip.description,
        startDate: trip.startDate,
        endDate: trip.endDate,
        duration: trip.getTripDuration(),
        estimatedBudget: trip.estimatedBudget,
        actualExpense: trip.actualExpense,
        baseCurrency: trip.baseCurrency,
        category: trip.category,
        status: trip.status,
        planningProgress: trip.planningProgress,
        createdAt: trip.createdAt,
        updatedAt: trip.updatedAt
      }
    };

    // Obtener miembros si se solicita
    if (dto.includeMembers !== false) {
      const members = await this.tripMemberRepository.findActiveMembersByTripId(tripId);
      const membersWithUserInfo = await Promise.all(
        members.map(async (member) => {
          const user = await this.userRepository.findById(member.userId);
          return {
            id: member.id,
            role: member.role,
            roleLabel: member.roleLabel,
            status: member.status,
            joinedAt: member.acceptedAt,
            user: user ? {
              firstName: user.firstName,
              lastName: user.lastName,
              email: user.email
            } : null
          };
        })
      );
      exportData.members = membersWithUserInfo;
    }

    // Aplicar filtro de fechas si se especifica
    if (dto.dateRange) {
      exportData.dateRange = {
        startDate: new Date(dto.dateRange.startDate),
        endDate: new Date(dto.dateRange.endDate)
      };
    }

    // Metadatos de exportación
    const exportMetadata = {
      exportedBy: userId,
      exportedAt: new Date(),
      format: dto.format,
      tripId,
      tripTitle: trip.title
    };

    // Generar el archivo
    const exportResult = await this.tripExportService.generateExport(
      exportData,
      exportMetadata,
      dto.format
    );

    return {
      fileName: exportResult.fileName,
      fileUrl: exportResult.fileUrl,
      fileSize: exportResult.fileSize,
      format: dto.format,
      generatedAt: new Date(),
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 horas
    };
  }
}