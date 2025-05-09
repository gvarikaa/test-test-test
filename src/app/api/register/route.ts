import { NextResponse } from "next/server";
import bcrypt from "bcrypt";
import { db } from "@/lib/db";
import { z } from "zod";

const registerSchema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters" }),
  username: z.string().min(3, { message: "Username must be at least 3 characters" }),
  email: z.string().email({ message: "Invalid email address" }),
  password: z.string().min(8, { message: "Password must be at least 8 characters" }),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    const validationResult = registerSchema.safeParse(body);
    
    if (!validationResult.success) {
      return NextResponse.json(
        { error: validationResult.error.errors[0].message },
        { status: 400 }
      );
    }
    
    const { name, username, email, password } = validationResult.data;
    
    const existingUser = await db.user.findFirst({
      where: {
        OR: [
          { email },
          { username },
        ]
      }
    });
    
    if (existingUser) {
      return NextResponse.json(
        { error: existingUser.email === email 
            ? "Email already registered" 
            : "Username already taken" 
        },
        { status: 400 }
      );
    }
    
    const hashedPassword = await bcrypt.hash(password, 12);
    
    const user = await db.user.create({
      data: {
        name,
        username,
        email,
        hashedPassword,
      }
    });
    
    return NextResponse.json(
      { 
        user: {
          id: user.id,
          name: user.name,
          username: user.username,
          email: user.email
        } 
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Registration error:", error);
    return NextResponse.json(
      { error: "An error occurred during registration" },
      { status: 500 }
    );
  }
}