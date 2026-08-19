import { SignJWT, jwtVerify, type JWTPayload } from "jose";

interface AccessTokenPayload {
    userId: string;
    sessionId: string;
    role: string;
}

const secret = process.env.ACCESS_TOKEN_SECRET;

if (!secret) {
    throw new Error("ACCESS_TOKEN_SECRET is not defined");
}

const secretKey = new TextEncoder().encode(secret);

const issuer = process.env.ACCESS_TOKEN_ISSUER || "coddite-api";
const audience =
    process.env.ACCESS_TOKEN_AUDIENCE || "coddite-client";

export async function createAccessToken(
    payload: AccessTokenPayload
): Promise<string> {
    return new SignJWT({
        userId: payload.userId,
        sessionId: payload.sessionId,
        role: payload.role,
    })
        .setProtectedHeader({
            alg: "HS256",
            typ: "JWT",
        })
        .setSubject(payload.userId)
        .setIssuer(issuer)
        .setAudience(audience)
        .setIssuedAt()
        .setExpirationTime(
            process.env.ACCESS_TOKEN_EXPIRES_IN || "15m"
        )
        .sign(secretKey);
}

export async function verifyAccessToken(
    token: string
): Promise<JWTPayload> {
    const { payload } = await jwtVerify(token, secretKey, {
        issuer,
        audience,
        algorithms: ["HS256"],
    });

    return payload;
}