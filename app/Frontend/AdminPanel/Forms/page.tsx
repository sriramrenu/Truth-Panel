'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Downbar from '../../Components/Downbar';
import Navbar from '../../Components/Navbar';

interface FormQuestion {
  id: string;
  type: 'multiple_choice' | 'checkboxes' | 'short_text';
  questionText: string;
  options?: string[];
}

interface TruthPanelForm {
  id: string;
  title: string;
  description: string;
  createdAt: string;
  questions: FormQuestion[];
}

interface QuestionAnswer {
  questionId: string;
  questionText: string;
  answer: string | string[];
}

interface FormResponse {
  responseId: string;
  formId: string;
  formTitle: string;
  submittedAt: string;
  workerEmail: string;
  workerName: string;
  answers: QuestionAnswer[];
}


export default function Forms() {
  const router = useRouter();
  const [forms, setForms] = useState<TruthPanelForm[]>([]);
  const [responseCounts, setResponseCounts] = useState<Record<string, number>>({});
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    const loadForms = async () => {
      try {
        const { fetchAllSurveys } = await import('../../../../utils/api');
        const res = await fetchAllSurveys();
        if (res?.success) {
          const normalized = (res.data || []).map((s: any) => ({
            id: s.id,
            title: s.title,
            description: s.description || '',
            createdAt: s.created_at,
            questions: (s.Questions || []),
          }));
          setForms(normalized);
          // Response counts are now tracked server-side via responses table
          const counts: Record<string, number> = {};
          normalized.forEach((f: any) => { counts[f.id] = 0; });
          setResponseCounts(counts);
        }
      } catch (err) {
        console.error('Failed to load forms', err);
      }
    };
    loadForms();
  }, []);

  return (
    <main className="min-h-screen bg-[var(--OffWhite)] text-[var(--OffBlack)]">
      <div className="mx-auto flex min-h-screen w-full max-w-[390px] flex-col pb-28">
        <Navbar />

        <section className="flex-1 px-4 pt-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h1 className="font-[var(--font-poppins)] text-2xl font-medium text-[var(--OffBlack)]">Forms</h1>
              <p className="mt-1 font-[var(--font-inter)] text-sm text-[var(--OffBlack)]/70">
                Review forms and response totals.
              </p>
            </div>

            <button
              type="button"
              onClick={() => router.push('/Frontend/AdminPanel/FormCreation')}
              className="rounded-lg bg-[var(--PBlue)] px-3 py-2 font-[var(--font-poppins)] text-xs text-white"
            >
              New Form
            </button>
          </div>

          <div className="mt-5 space-y-3">
            {!isMounted ? null : forms.length === 0 ? (
              <div className="flex min-h-[50vh] items-center justify-center rounded-2xl bg-white px-4 text-center shadow-sm">
                <p className="font-[var(--font-inter)] text-sm text-[var(--OffBlack)]/70">No forms created yet.</p>
              </div>
            ) : (
              forms.map((form) => (
                <button
                  key={form.id}
                  type="button"
                  onClick={() => router.push(`/Frontend/AdminPanel/Forms/${form.id}`)}
                  className="flex w-full items-center justify-between rounded-2xl bg-white px-4 py-4 text-left shadow-sm"
                >
                  <div className="min-w-0">
                    <p className="truncate font-[var(--font-poppins)] text-sm font-medium text-[var(--OffBlack)]">
                      {form.title || 'Untitled Form'}
                    </p>
                    <p className="mt-1 truncate font-[var(--font-inter)] text-xs text-[var(--OffBlack)]/60">
                      {form.questions.length} questions  •  {responseCounts[form.id] ?? 0} responses
                    </p>
                  </div>

                  <span className="ml-4 font-[var(--font-poppins)] text-xl text-[var(--PBlue)]">›</span>
                </button>
              ))
            )}
          </div>
        </section>
      </div>

      <Downbar />
    </main>
  );
}