export declare enum UserRole {
    STUDENT = "student",
    TEACHER = "teacher",
    ADMIN = "admin"
}
export declare class User {
    id: string;
    email: string;
    passwordHash: string;
    name: string;
    avatarUrl: string;
    role: UserRole;
    oauthProvider: string;
    oauthId: string;
    isActive: boolean;
    isVerified: boolean;
    emailVerificationToken: string | null;
    refreshTokenHash: string | null;
    createdAt: Date;
    updatedAt: Date;
}
