export interface Slot {
    id: string; // Unique ID for our system
    provider: 'doinsport' | 'resamania' | 'headesh' | 'matchpoint' | 'anybuddy' | 'livexperience' | 'gestion-sports' | 'ucpa' | 'ballejaune' | 'tennislibre';
    centerName: string;
    startTime: Date;
    endTime: Date;
    durationMinutes: number;
    price: number | null;
    currency: string;
    bookingUrl: string;
    courtName?: string;
    availableCourts?: number;  // How many courts are free at this time slot
    indoor?: boolean;          // Indoor or outdoor
    technicalDetails?: any;    // To store provider-specific raw data if needed
}

export interface BookingProvider {
    name: string;
    fetchSlots(date: Date): Promise<Slot[]>;
}
