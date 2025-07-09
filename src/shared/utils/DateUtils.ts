export class DateUtils {
  // Formatear fecha a string legible
  public static formatDate(date: Date, locale: string = 'es-ES'): string {
    return date.toLocaleDateString(locale, {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

  // Formatear fecha y hora
  public static formatDateTime(date: Date, locale: string = 'es-ES'): string {
    return date.toLocaleString(locale, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  // Obtener fecha en formato ISO string
  public static toISOString(date: Date): string {
    return date.toISOString();
  }

  // Parsear string a fecha
  public static parseDate(dateString: string): Date {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
      throw new Error('Formato de fecha inválido');
    }
    return date;
  }

  // Validar si una fecha es válida
  public static isValidDate(date: any): boolean {
    return date instanceof Date && !isNaN(date.getTime());
  }

  // Calcular diferencia en días
  public static getDaysDifference(date1: Date, date2: Date): number {
    const diffTime = Math.abs(date2.getTime() - date1.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  // Agregar días a una fecha
  public static addDays(date: Date, days: number): Date {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
  }

  // Restar días a una fecha
  public static subtractDays(date: Date, days: number): Date {
    return this.addDays(date, -days);
  }

  // Obtener inicio del día
  public static startOfDay(date: Date): Date {
    const result = new Date(date);
    result.setHours(0, 0, 0, 0);
    return result;
  }

  // Obtener fin del día
  public static endOfDay(date: Date): Date {
    const result = new Date(date);
    result.setHours(23, 59, 59, 999);
    return result;
  }

  // Validar rango de fechas para viajes
  public static validateTripDateRange(startDate: Date, endDate: Date): {
    isValid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];
    const now = new Date();
    const maxAdvanceDays = 365 * 2; // 2 años en el futuro
    const maxTripDuration = 365; // 1 año máximo de duración

    // Validar que las fechas sean válidas
    if (!this.isValidDate(startDate)) {
      errors.push('Fecha de inicio inválida');
    }

    if (!this.isValidDate(endDate)) {
      errors.push('Fecha de fin inválida');
    }

    if (errors.length > 0) {
      return { isValid: false, errors };
    }

    // Validar que la fecha de inicio no sea pasada
    if (startDate < this.startOfDay(now)) {
      errors.push('La fecha de inicio no puede ser anterior a hoy');
    }

    // Validar que la fecha de fin sea posterior a la de inicio
    if (endDate <= startDate) {
      errors.push('La fecha de fin debe ser posterior a la fecha de inicio');
    }

    // Validar que no sea muy lejana en el futuro
    const maxFutureDate = this.addDays(now, maxAdvanceDays);
    if (startDate > maxFutureDate) {
      errors.push(`La fecha de inicio no puede ser más de ${maxAdvanceDays} días en el futuro`);
    }

    // Validar duración máxima del viaje
    const tripDuration = this.getDaysDifference(startDate, endDate);
    if (tripDuration > maxTripDuration) {
      errors.push(`La duración del viaje no puede exceder ${maxTripDuration} días`);
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  // Obtener días de la semana entre dos fechas
  public static getDaysInRange(startDate: Date, endDate: Date): Date[] {
    const days: Date[] = [];
    const currentDate = new Date(startDate);

    while (currentDate <= endDate) {
      days.push(new Date(currentDate));
      currentDate.setDate(currentDate.getDate() + 1);
    }

    return days;
  }

  // Formatear duración en días a string legible
  public static formatDuration(days: number): string {
    if (days === 1) {
      return '1 día';
    } else if (days < 7) {
      return `${days} días`;
    } else if (days < 30) {
      const weeks = Math.floor(days / 7);
      const remainingDays = days % 7;
      let result = `${weeks} semana${weeks > 1 ? 's' : ''}`;
      if (remainingDays > 0) {
        result += ` y ${remainingDays} día${remainingDays > 1 ? 's' : ''}`;
      }
      return result;
    } else {
      const months = Math.floor(days / 30);
      const remainingDays = days % 30;
      let result = `${months} mes${months > 1 ? 'es' : ''}`;
      if (remainingDays > 0) {
        result += ` y ${remainingDays} día${remainingDays > 1 ? 's' : ''}`;
      }
      return result;
    }
  }

  // Verificar si una fecha está en el pasado
  public static isPastDate(date: Date): boolean {
    return date < new Date();
  }

  // Verificar si una fecha está en el futuro
  public static isFutureDate(date: Date): boolean {
    return date > new Date();
  }

  // Obtener mes y año de una fecha
  public static getMonthYear(date: Date): { month: number; year: number } {
    return {
      month: date.getMonth() + 1, // getMonth() retorna 0-11
      year: date.getFullYear()
    };
  }

  // Convertir timezone
  public static convertTimezone(date: Date, timezone: string): string {
    try {
      return date.toLocaleString('en-US', { timeZone: timezone });
    } catch (error) {
      // Fallback si la timezone no es válida
      return date.toISOString();
    }
  }

  // Obtener timestamp Unix
  public static toUnixTimestamp(date: Date): number {
    return Math.floor(date.getTime() / 1000);
  }

  // Crear fecha desde timestamp Unix
  public static fromUnixTimestamp(timestamp: number): Date {
    return new Date(timestamp * 1000);
  }

  // Verificar si dos fechas son el mismo día
  public static isSameDay(date1: Date, date2: Date): boolean {
    return this.startOfDay(date1).getTime() === this.startOfDay(date2).getTime();
  }

  // Obtener el nombre del día de la semana
  public static getDayName(date: Date, locale: string = 'es-ES'): string {
    return date.toLocaleDateString(locale, { weekday: 'long' });
  }

  // Obtener el nombre del mes
  public static getMonthName(date: Date, locale: string = 'es-ES'): string {
    return date.toLocaleDateString(locale, { month: 'long' });
  }

  // Crear fecha solo con año, mes y día (sin hora)
  public static createDateOnly(year: number, month: number, day: number): Date {
    return new Date(year, month - 1, day); // month es 0-indexed en Date
  }

  // Obtener fecha relativa (ej: "hace 2 días", "en 3 días")
  public static getRelativeTime(date: Date, locale: string = 'es-ES'): string {
    const now = new Date();
    const diffMs = date.getTime() - now.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return 'Hoy';
    } else if (diffDays === 1) {
      return 'Mañana';
    } else if (diffDays === -1) {
      return 'Ayer';
    } else if (diffDays > 0) {
      return `En ${diffDays} día${diffDays > 1 ? 's' : ''}`;
    } else {
      return `Hace ${Math.abs(diffDays)} día${Math.abs(diffDays) > 1 ? 's' : ''}`;
    }
  }
}