import { sql } from "@vercel/postgres";
import { unstable_noStore as noStore } from "next/cache";
import qs from "qs";
import { flattenAttributes } from "@/app/lib/utils";
import { formatCurrency } from "./utils";

import {
  CustomersTable,
  User,
} from "./definitions";


export async function fetchRevenue() {
  await new Promise((resolve) => setTimeout(resolve, 2000));

  try {
    const query = qs.stringify({
      sort: ["date:asc"],
      pagination: {
        pageSize: 12,
        page: 1,
      },
    });
    const response = await fetch(
      "http://localhost:1337/api/revenues?" + query,
      {
        cache: "no-store",
      }
    );
    const data = await response.json();
    const revenue = flattenAttributes(data.data);
    return revenue;
  } catch (error) {
    console.error("Database Error:", error);
    throw new Error("Failed to fetch revenue data.");
  }
}

export async function fetchLatestInvoices() {
  const query = qs.stringify({
    sort: ["date:asc"],
    populate: {
      customer: {
        populate: {
          image: {
            fields: ["url"],
          },
        },
      },
    },
    pagination: {
      pageSize: 5,
      page: 1,
    },
  });

  try {
    const response = await fetch(
      "http://localhost:1337/api/invoices?" + query,
      {
        cache: "no-store",
      }
    );
    const data = await response.json();
    const flattened = flattenAttributes(data.data);

    const latestInvoices = flattened.map((invoice: any) => ({
      ...invoice,
      amount: formatCurrency(invoice.amount),
    }));

    return latestInvoices;
  } catch (error) {
    console.error("Database Error:", error);
    throw new Error("Failed to fetch the latest invoices.");
  }
}

export async function fetchCardData() {
  noStore();

  try {
    const totalPendingInvoicesPromise = await fetch(
      "http://localhost:1337/api/invoices-status/pending"
    );
    const totalPaidInvoicesPromise = await fetch(
      "http://localhost:1337/api/invoices-status/paid"
    );
    const numberOfCustomerPromise = await fetch(
      "http://localhost:1337/api/total-customers"
    );
    const numberOfInvoicesPromise = await fetch(
      "http://localhost:1337/api/invoices-status/total"
    );

    const data = await Promise.all([
      numberOfInvoicesPromise.json(),
      numberOfCustomerPromise.json(),
      totalPendingInvoicesPromise.json(),
      totalPaidInvoicesPromise.json(),
    ]);

    const numberOfInvoices = Number(data[0].data.count || 0);
    const numberOfCustomers = Number(data[1].data.count || 0);
    const totalPendingInvoices = formatCurrency(data[2].data.totalOwed);
    const totalPaidInvoices = formatCurrency(data[3].data.totalPaid);

    console.log(totalPaidInvoices, totalPendingInvoices);
    return {
      numberOfInvoices,
      numberOfCustomers,
      totalPaidInvoices,
      totalPendingInvoices,
    };
  } catch (error) {
    console.error("Database Error:", error);
    throw new Error("Failed to load card data.");
  }
}

const ITEMS_PER_PAGE = 6;
export async function fetchFilteredInvoices(
  query: string,
  currentPage: number
) {
  noStore();

  const queryObject = qs.stringify({
    sort: ["date:asc"],
    populate: {
      customer: {
        populate: {
          image: {
            fields: ["url"],
          },
        },
      },
    },

    pagination: {
      pageSize: ITEMS_PER_PAGE,
      page: currentPage,
    },
    filters: {
      $or: [
        {
          status: {
            $contains: query,
          },
        },
        {
          amount: {
            $contains: query,
          },
        },
        {
          customer: {
            name: {
              $contains: query,
            },
          },
        },
        {
          customer: {
            email: {
              $contains: query,
            },
          },
        },
      ],
    },
  });

  try {
    const response = await fetch(
      "http://localhost:1337/api/invoices?" + queryObject
    );
    const data = await response.json();
    const flattened = flattenAttributes(data.data);
    return { data: flattened, meta: data.meta };
  } catch (error) {
    console.error("Database Error:", error);
    throw new Error("Failed to fetch invoices.");
  }
}


export async function fetchCustomers() {
  const query = qs.stringify({
    populate: {
      fields: ["id", "name"],
    }, 
  });
  try {
    const data = await fetch("http://localhost:1337/api/customers?" + query);
    const customers = await data.json();
    const flatten = flattenAttributes(customers.data);
    return flatten;
  } catch (err) {
    console.error("Database Error:", err);
    throw new Error("Failed to fetch all customers.");
  }
}

export async function fetchInvoiceById(id: string) {
  const query = qs.stringify({
    populate: {
      customer: {
        populate: {
          image: {
            fields: ["url"],
          },
        },
      },
    },
  });

  try {
    const data = await fetch("http://localhost:1337/api/invoices/" + id + "?" + query);
    const invoice = await data.json();
    const flatten = flattenAttributes(invoice.data);
    return flatten;
  } catch (err) {
    console.error("Database Error:", err);
    throw new Error("Failed to fetch all customers.");
  }
}

export async function fetchInvoicesPages(query: string) {
  try {
    const count = await sql`SELECT COUNT(*)
    FROM invoices
    JOIN customers ON invoices.customer_id = customers.id
    WHERE
      customers.name ILIKE ${`%${query}%`} OR
      customers.email ILIKE ${`%${query}%`} OR
      invoices.amount::text ILIKE ${`%${query}%`} OR
      invoices.date::text ILIKE ${`%${query}%`} OR
      invoices.status ILIKE ${`%${query}%`}
  `;

    const totalPages = Math.ceil(Number(count.rows[0].count) / ITEMS_PER_PAGE);
    return totalPages;
  } catch (error) {
    console.error("Database Error:", error);
    throw new Error("Failed to fetch total number of invoices.");
  }
}

export async function fetchFilteredCustomers(query: string) {
  try {
    const data = await sql<CustomersTable>`
		SELECT
		  customers.id,
		  customers.name,
		  customers.email,
		  customers.image_url,
		  COUNT(invoices.id) AS total_invoices,
		  SUM(CASE WHEN invoices.status = 'pending' THEN invoices.amount ELSE 0 END) AS total_pending,
		  SUM(CASE WHEN invoices.status = 'paid' THEN invoices.amount ELSE 0 END) AS total_paid
		FROM customers
		LEFT JOIN invoices ON customers.id = invoices.customer_id
		WHERE
		  customers.name ILIKE ${`%${query}%`} OR
        customers.email ILIKE ${`%${query}%`}
		GROUP BY customers.id, customers.name, customers.email, customers.image_url
		ORDER BY customers.name ASC
	  `;

    const customers = data.rows.map((customer) => ({
      ...customer,
      total_pending: formatCurrency(customer.total_pending),
      total_paid: formatCurrency(customer.total_paid),
    }));

    return customers;
  } catch (err) {
    console.error("Database Error:", err);
    throw new Error("Failed to fetch customer table.");
  }
}

export async function getUser(email: string) {
  try {
    const user = await sql`SELECT * from USERS where email=${email}`;
    return user.rows[0] as User;
  } catch (error) {
    console.error("Failed to fetch user:", error);
    throw new Error("Failed to fetch user.");
  }
}
