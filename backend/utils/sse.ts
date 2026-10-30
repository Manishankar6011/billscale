import { Response } from 'express';

const sseClients = new Map<string, Response[]>();

export const addSSEClient = (tenantId: string, res: Response) => {
    if (!sseClients.has(tenantId)) {
        sseClients.set(tenantId, []);
    }
    sseClients.get(tenantId)!.push(res);
};

export const removeSSEClient = (tenantId: string, res: Response) => {
    const clients = sseClients.get(tenantId);
    if (!clients) return;
    const filtered = clients.filter(c => c !== res);
    if (filtered.length > 0) {
        sseClients.set(tenantId, filtered);
    } else {
        sseClients.delete(tenantId);
    }
};

export const broadcastToTenant = (tenantId: string, event: string, data: any) => {
    const clients = sseClients.get(tenantId);
    if (!clients || clients.length === 0) return;
    const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
    clients.forEach(client => {
        try {
            client.write(payload);
        } catch (e) {
            // ignore broken connection
        }
    });
};

