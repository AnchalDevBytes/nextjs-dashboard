'use server';
 
import { signIn } from '@/auth';
import { sql } from '@vercel/postgres';
import { AuthError } from 'next-auth';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
 
const FormSchema = z.object({
  id: z.string(),
  customerId: z.string({
    invalid_type_error: 'Please select the customer',
  }),
  amount: z.coerce.number().gt(0, {message: 'Please enter an amount greater than $0'}),
  status: z.enum(['pending', 'paid'], {
    invalid_type_error: 'Please select an invoice status.',
  }),
  date: z.string(),
});
 
const CreateInvoice = FormSchema.omit({ id: true, date: true });
const UpdateInvoice = FormSchema.omit({ id: true, date: true });


export type State = {
  errors?: {
    customerId?: string[];
    amount?: string[];
    status?: string[];
  };
  message?: string | null;
};

export async function createInvoice(prevState: State, formData: FormData) {
 
  //validate from using zod
     const validatedFields = CreateInvoice.safeParse({
         customerId: formData.get('customerId'),
         amount: formData.get('amount'),
         status: formData.get('status'),
       });

       if (!validatedFields.success) {
        return {
          errors: validatedFields.error.flatten().fieldErrors,
          message: 'Missing Fields. Failed to Create Invoice.',
        };
      }

      //prepare data for insertion into database
      const {amount, customerId, status} = validatedFields.data;
       const amountInCents = amount * 100;
       const date = new Date().toISOString().split('T')[0];      //create a new date with the format "YYYY-MM-DD" for the invoice's creation date
   
       try {
       //Insert new Invoice in database
       await sql `
       INSERT INTO invoices (customer_id, amount, status, date)
       VALUES (${customerId}, ${amountInCents}, ${status}, ${date})
       ` ;
        } catch (error) {
           return {  message: 'Database Error: Failed to Create Invoice.' }
        }

        //reValidate the cache for invoice page and redirect the user
        revalidatePath('/dashboard/invoices');
        redirect('/dashboard/invoices');

  }
    


  export async function updateInvoice(
    id: string,
    formData: FormData,
  ) {

    const { customerId, amount, status } = UpdateInvoice.parse({
      customerId: formData.get('customerId'),
      amount: formData.get('amount'),
      status: formData.get('status'),
    });
    const amountInCents = amount * 100;
   
   try {
     await sql`
       UPDATE invoices
       SET customer_id = ${customerId}, amount = ${amountInCents}, status = ${status}
       WHERE id = ${id}
     `;
   } catch (error) {
   return { message: 'Database Error: Failed to update Invoice.'}
   }
   
    revalidatePath('/dashboard/invoices');
    redirect('/dashboard/invoices');
  }
    

  export async function deleteInvoice(id: string) {
    // throw new Error('Failed to Delete Invoice');
    try {
        await sql`DELETE FROM invoices WHERE id = ${id}`;
        revalidatePath('/dashboard/invoices');
    } catch (error) {
        return { message: 'Database Error: Failed to delete Invoice.'}
    }
  }


  export async function authenticate(
    prevState: string | undefined,
    formData : FormData,
  ) {
    try {
      await signIn('credentials', formData)
    } catch (error) {
      if (error instanceof AuthError) {
        switch (error.type) {
          case 'CredentialsSignin':
            return 'Invalid credentials.';
          default:
            return 'Something went wrong.';
        }
      }
      throw error;
    
    }
  }