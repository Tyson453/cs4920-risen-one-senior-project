export interface Employee {
    uuid: string;
    name: string;
    firstName: string;
    lastName: string;
    startDate: string;
    supervisorName: string;
    supervisorId: string;
    email: string;
    maxHours: string;
    hoursLeft: string;
    requestedPTO: object;
    requestedSickTime: object;
    notes: string;
}
