// src/modules/trips/infrastructure/services/TripExportService.ts
import * as ExcelJS from 'exceljs';
import * as PDFDocument from 'pdfkit';
import { promises as fs } from 'fs';
import { join } from 'path';

interface ExportData {
  trip: any;
  members?: any[];
  dateRange?: {
    startDate: Date;
    endDate: Date;
  };
}

interface ExportMetadata {
  exportedBy: string;
  exportedAt: Date;
  format: string;
  tripId: string;
  tripTitle: string;
}

interface ExportResult {
  fileName: string;
  fileUrl: string;
  fileSize: number;
}

export class TripExportService {
  private readonly exportDir: string;
  private readonly baseUrl: string;

  constructor() {
    this.exportDir = process.env.EXPORT_DIR || './exports';
    this.baseUrl = process.env.BASE_URL || 'http://localhost:3000';
    this.ensureExportDirectory();
  }

  public async generateExport(
    data: ExportData,
    metadata: ExportMetadata,
    format: 'pdf' | 'excel'
  ): Promise<ExportResult> {
    if (format === 'pdf') {
      return await this.generatePDFExport(data, metadata);
    } else {
      return await this.generateExcelExport(data, metadata);
    }
  }

  private async generatePDFExport(data: ExportData, metadata: ExportMetadata): Promise<ExportResult> {
    const fileName = `trip_${metadata.tripId}_${Date.now()}.pdf`;
    const filePath = join(this.exportDir, fileName);

    return new Promise((resolve, reject) => {
      const doc = new PDFDocument();
      const stream = require('fs').createWriteStream(filePath);
      doc.pipe(stream);

      // Encabezado
      doc.fontSize(20).text('Resumen de Viaje', { align: 'center' });
      doc.moveDown();

      // Información del viaje
      doc.fontSize(16).text('Información General', { underline: true });
      doc.fontSize(12)
        .text(`Título: ${data.trip.title}`)
        .text(`Destino: ${data.trip.destination}`)
        .text(`Duración: ${data.trip.duration} días`)
        .text(`Fecha de inicio: ${new Date(data.trip.startDate).toLocaleDateString()}`)
        .text(`Fecha de fin: ${new Date(data.trip.endDate).toLocaleDateString()}`)
        .text(`Estado: ${data.trip.status}`)
        .text(`Categoría: ${data.trip.category}`)
        .text(`Progreso de planificación: ${data.trip.planningProgress}%`);

      if (data.trip.description) {
        doc.moveDown().text(`Descripción: ${data.trip.description}`);
      }

      // Información financiera
      doc.moveDown().fontSize(16).text('Información Financiera', { underline: true });
      doc.fontSize(12)
        .text(`Presupuesto estimado: ${data.trip.estimatedBudget || 0} ${data.trip.baseCurrency}`)
        .text(`Gastos reales: ${data.trip.actualExpense} ${data.trip.baseCurrency}`);

      if (data.trip.estimatedBudget) {
        const remaining = data.trip.estimatedBudget - data.trip.actualExpense;
        doc.text(`Presupuesto restante: ${remaining} ${data.trip.baseCurrency}`);
      }

      // Miembros del viaje
      if (data.members && data.members.length > 0) {
        doc.moveDown().fontSize(16).text('Miembros del Viaje', { underline: true });
        doc.fontSize(12);

        data.members.forEach(member => {
          const userName = member.user ? `${member.user.firstName} ${member.user.lastName}` : 'Usuario desconocido';
          const joinDate = member.joinedAt ? new Date(member.joinedAt).toLocaleDateString() : 'Pendiente';
          doc.text(`• ${userName} (${member.roleLabel}) - Se unió: ${joinDate}`);
        });
      }

      // Información de exportación
      doc.moveDown(2).fontSize(10).text('---', { align: 'center' });
      doc.text(`Exportado el: ${metadata.exportedAt.toLocaleString()}`, { align: 'center' });

      doc.end();

      stream.on('finish', async () => {
        try {
          const stats = await fs.stat(filePath);
          resolve({
            fileName,
            fileUrl: `${this.baseUrl}/exports/${fileName}`,
            fileSize: stats.size
          });
        } catch (error) {
          reject(error);
        }
      });

      stream.on('error', reject);
    });
  }

  private async generateExcelExport(data: ExportData, metadata: ExportMetadata): Promise<ExportResult> {
    const fileName = `trip_${metadata.tripId}_${Date.now()}.xlsx`;
    const filePath = join(this.exportDir, fileName);

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Voyaj';
    workbook.created = metadata.exportedAt;

    // Hoja de información general
    const tripSheet = workbook.addWorksheet('Información del Viaje');
    
    // Configurar columnas
    tripSheet.columns = [
      { header: 'Campo', key: 'field', width: 25 },
      { header: 'Valor', key: 'value', width: 40 }
    ];

    // Datos del viaje
    const tripData = [
      { field: 'Título', value: data.trip.title },
      { field: 'Destino', value: data.trip.destination },
      { field: 'Descripción', value: data.trip.description || 'Sin descripción' },
      { field: 'Fecha de inicio', value: new Date(data.trip.startDate).toLocaleDateString() },
      { field: 'Fecha de fin', value: new Date(data.trip.endDate).toLocaleDateString() },
      { field: 'Duración (días)', value: data.trip.duration },
      { field: 'Estado', value: data.trip.status },
      { field: 'Categoría', value: data.trip.category },
      { field: 'Progreso de planificación (%)', value: data.trip.planningProgress },
      { field: 'Presupuesto estimado', value: `${data.trip.estimatedBudget || 0} ${data.trip.baseCurrency}` },
      { field: 'Gastos reales', value: `${data.trip.actualExpense} ${data.trip.baseCurrency}` }
    ];

    tripSheet.addRows(tripData);

    // Aplicar estilos
    tripSheet.getRow(1).font = { bold: true };
    tripSheet.getColumn(1).font = { bold: true };

    // Hoja de miembros
    if (data.members && data.members.length > 0) {
      const membersSheet = workbook.addWorksheet('Miembros');
      
      membersSheet.columns = [
        { header: 'Nombre', key: 'name', width: 30 },
        { header: 'Email', key: 'email', width: 35 },
        { header: 'Rol', key: 'role', width: 20 },
        { header: 'Estado', key: 'status', width: 15 },
        { header: 'Fecha de ingreso', key: 'joinedAt', width: 20 }
      ];

      const membersData = data.members.map(member => ({
        name: member.user ? `${member.user.firstName} ${member.user.lastName}` : 'Usuario desconocido',
        email: member.user ? member.user.email : 'Email desconocido',
        role: member.roleLabel,
        status: member.status,
        joinedAt: member.joinedAt ? new Date(member.joinedAt).toLocaleDateString() : 'Pendiente'
      }));

      membersSheet.addRows(membersData);
      membersSheet.getRow(1).font = { bold: true };
    }

    // Guardar archivo
    await workbook.xlsx.writeFile(filePath);

    // Obtener estadísticas del archivo
    const stats = await fs.stat(filePath);

    return {
      fileName,
      fileUrl: `${this.baseUrl}/exports/${fileName}`,
      fileSize: stats.size
    };
  }

  private async ensureExportDirectory(): Promise<void> {
    try {
      await fs.access(this.exportDir);
    } catch {
      await fs.mkdir(this.exportDir, { recursive: true });
    }
  }

  // Limpiar archivos de exportación antiguos
  public async cleanupOldExports(olderThanHours: number = 24): Promise<number> {
    const cutoffTime = Date.now() - (olderThanHours * 60 * 60 * 1000);
    let deletedCount = 0;

    try {
      const files = await fs.readdir(this.exportDir);
      
      for (const file of files) {
        const filePath = join(this.exportDir, file);
        const stats = await fs.stat(filePath);
        
        if (stats.mtime.getTime() < cutoffTime) {
          await fs.unlink(filePath);
          deletedCount++;
        }
      }
    } catch (error) {
      console.error('Error al limpiar archivos de exportación:', error);
    }

    return deletedCount;
  }
}