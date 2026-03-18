export type PTOStatus = 'PENDING' | 'APPROVED' | 'DENIED';

export interface PTORequest {
    id: string;
    ptoId?: string;
    userId?: string;
    employeeName: string;
    supervisorId?: string;
    startDate: string;
    endDate: string;
    type: 'PTO' | 'SICK';
    reason?: string;
    status: PTOStatus;
    denialReason?: string;
    createdDate: string;
    createdTimestamp: string;
}
