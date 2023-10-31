"use server";
import { z } from "zod";
import { revalidatePath } from "next/cache";

const InvoiceSchema = z.object({
  id: z.string(),
  customerId: z.string(),
  amount: z.coerce.number(),
  status: z.enum(["pending", "paid"]),
  date: z.string(),
});

const CreateInvoice = InvoiceSchema.omit({ id: true, date: true });
export async function createInvoice(prevState: any, formData: FormData) {
  const { customerId, amount, status } = CreateInvoice.parse({
    customerId: formData.get("customerId"),
    amount: formData.get("amount"),
    status: formData.get("status"),
  });

  const amountInCents = amount * 100;
  const date = new Date().toISOString().split("T")[0];

  const dataToSend = {
    data: {
      amount: amountInCents,
      status,
      date,
      customer: {
        connect: [{ id: customerId }],
      },
    },
  };

  try {
    const response = await fetch("http://localhost:1337/api/invoices", {
      method: "POST",
      body: JSON.stringify(dataToSend),
      headers: {
        "Content-Type": "application/json",
      },
    });
    const data = await response.json();
    if (!response.ok)
      return { ok: false, error: data.error.message, data: null };
    if (response.ok && data.error)
      return { ok: false, error: data.error.message, data: null };
    else {
      revalidatePath("/dashboard/invoices");
      // TODO: FIGURE OUT WHY THIS IS NOT WORKING
      // Implemented on the frontend using useFormState
      // redirect('/dashboard/invoices');
      return { ok: true, data: data.data };
    }
  } catch (err) {
    console.error("Database Error:", err);
    throw new Error("Failed to fetch all customers.");
  }
}

const UpdateInvoice = InvoiceSchema.omit({ date: true });
export async function updateInvoice(prevState: any, formData: FormData) {
  const { customerId, amount, status, id } = UpdateInvoice.parse({
    customerId: formData.get("customerId"),
    amount: formData.get("amount"),
    status: formData.get("status"),
    invoiceId: formData.get("invoiceId"),
    id: formData.get("id"),
  });

  const amountInCents = amount * 100;
  const date = new Date().toISOString().split("T")[0];

  const dataToSend = {
    data: {
      amount: amountInCents,
      status,
      date,
      customer: {
        connect: [{ id: customerId }],
      },
    },
  };

  try {
    const response = await fetch("http://localhost:1337/api/invoices/" + id, {
      method: "PUT",
      body: JSON.stringify(dataToSend),
      headers: {
        "Content-Type": "application/json",
      },
    });
    const data = await response.json();
    if (!response.ok)
      return { ok: false, error: data.error.message, data: null };
    if (response.ok && data.error)
      return { ok: false, error: data.error.message, data: null };
    else {
      revalidatePath("/dashboard/invoices");
      // TODO: FIGURE OUT WHY THIS IS NOT WORKING
      // Implemented on the frontend using useFormState
      // redirect('/dashboard/invoices');
      return { ok: true, data: data.data };
    }
  } catch (err) {
    console.error("Database Error:", err);
    throw new Error("Failed to update invoice.");
  }
}
