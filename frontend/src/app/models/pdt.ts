export type PDTStatus = 'DRAFT' | 'PENDING_APPROVAL' | 'APPROVED' | 'CHANGES_REQUESTED';

export interface PDT {
    id: string;
    pdtId?: string;
    createdDate: string;
    createdTimestamp: string;
    empName: string;
    shortTermGoals: string;
    mediumTermGoals: string;
    longTermGoals: string;
    developmentNeeds: string;
    actionPlan: string;
    empSignature: string;
    superSignature: string;
    status: PDTStatus;
    supervisorComments?: string;
    userId?: string;
}
