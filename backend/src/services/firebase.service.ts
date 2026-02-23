import admin from "firebase-admin";

let initialized = false;

export function getFirebaseApp(): admin.app.App {
  if (initialized) return admin.app();

  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error(
      "Missing Firebase env vars: FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY"
    );
  }

  admin.initializeApp({
    credential: admin.credential.cert({ projectId, clientEmail, privateKey }),
  });

  initialized = true;
  return admin.app();
}

export interface FirebaseUser {
  uid: string;
  email: string;
  name?: string;
  picture?: string;
}

/**
 * Verify a Firebase ID token (sent from client after Google sign-in).
 * Returns the decoded user payload.
 */
export async function verifyIdToken(idToken: string): Promise<FirebaseUser> {
  const app = getFirebaseApp();
  const decoded = await app.auth().verifyIdToken(idToken);

  if (!decoded.email) {
    throw new Error("Google account has no email address");
  }

  return {
    uid: decoded.uid,
    email: decoded.email,
    name: decoded.name as string | undefined,
    picture: decoded.picture as string | undefined,
  };
}
