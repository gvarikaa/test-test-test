import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { db } from "./db";

export async function getCurrentUser() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.email) {
    return null;
  }

  const currentUser = await db.user.findUnique({
    where: {
      email: session.user.email as string,
    },
  });

  if (!currentUser) {
    return null;
  }

  return {
    ...currentUser,
    hashedPassword: undefined,
  };
}

export async function getUserById(id: string) {
  try {
    const user = await db.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        username: true,
        image: true,
        bio: true,
        coverImage: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return user;
  } catch {
    return null;
  }
}