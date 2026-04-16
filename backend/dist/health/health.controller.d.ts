export declare class HealthController {
    check(): {
        status: string;
        uptime: number;
        timestamp: string;
        memory: NodeJS.MemoryUsage;
    };
}
