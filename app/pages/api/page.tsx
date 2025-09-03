import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { data, error, status } = await supabase
      .from("pd_screenings")
      .select("*")
      .limit(1);

    return res.status(200).json({ data, error, status });
  } catch (err) {
    return res.status(500).json({ error: String(err) });
  }
}
