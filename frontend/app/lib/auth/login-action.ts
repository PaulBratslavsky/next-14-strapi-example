"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";

export type State = {
  errors?: {
    identifier?: string[];
    password?: string[];
  };
  message?: string | null;
};

const formSchema = z.object({
  identifier: z.string().min(2).max(50),
  password: z.string().min(8).max(100),
});



export async function loginAction(prevState: State, formData: FormData) {
  const url = `${process.env.STRAPI_URL}/api/auth/local`;

  const validatedFields = formSchema.safeParse({
    identifier: formData.get("identifier"),
    password: formData.get("password"),
  });

  if (!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors,
      message: "Missing Fields. Failed to Create Invoice.",
    };
  }

  const { identifier, password } = validatedFields.data;


  try {
    const response: any = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ identifier, password }),
      cache: "no-cache",
    });
    const data = await response.json();
    if (!response.ok && !data.error) return { error: data.error, ok: false };
    if (!response.ok && data.jwt) cookies().set("jwt", data.jwt);
  } catch (error) {
    console.log(error);
    return { error: "Server error please try again later." };
  }
  redirect("/dashboard");
};

export default loginAction;
