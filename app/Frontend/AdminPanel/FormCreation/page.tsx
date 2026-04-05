'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Downbar from '../../Components/Downbar';
import Navbar from '../../Components/Navbar';

type QuestionType = 'multiple_choice' | 'checkboxes' | 'short_text';

interface FormQuestion {
  id: string;
  type: QuestionType;
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


export default function FormCreation() {
  const router = useRouter();
  const [forms, setForms] = useState<TruthPanelForm[]>([]);
  const [deleteTarget, setDeleteTarget] = useState<TruthPanelForm | null>(null);

  const handleDelete = async (id: string) => {
    // Optimistic UI update
    setForms((prev) => prev.filter((f) => f.id !== id));
    setDeleteTarget(null);
    // TODO: Add DELETE /api/surveys/:id endpoint when needed
  };

  useEffect(() => {
    sessionStorage.removeItem('truth_panel_draft');
    // Fetch live surveys from Express API
    const loadForms = async () => {
      try {
        const { fetchAllSurveys } = await import('../../../../utils/api');
        const res = await fetchAllSurveys();
        if (res?.success) {
          setForms((res.data || []).map((s: any) => ({
            id: s.id,
            title: s.title,
            description: s.description || '',
            createdAt: s.created_at,
            questions: (s.Questions || []).map((q: any) => ({
              id: q.id,
              type: q.question_type === 'MCQ' ? 'multiple_choice' : q.question_type,
              questionText: q.question_text,
              options: q.options || [],
            })),
          })));
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

        <section className="flex flex-1 flex-col px-5 pb-8 pt-2 mt-[10%] ">
          

          <div className="text-center">
            <h1 className="font-[var(--font-poppins)] text-4xl font-medium leading-tight text-[var(--OffBlack)]">
              Create a Form
            </h1>
            <p className="mt-3 max-w-[280px] font-[var(--font-inter)] text-sm font-light text-[var(--OffBlack)]/75 ml-auto mr-auto">
              Build your custom form step by step
            </p>

            <button
              type="button"
              onClick={() => router.push('/Frontend/AdminPanel/FormCreation/Builder')}
              className="mt-8 w-full rounded-2xl bg-[var(--PBlue)] px-6 py-4 font-[var(--font-poppins)] text-base font-medium text-white shadow-[0_12px_24px_rgba(28,105,174,0.28)]"
            >
              Get Started
            </button>
          </div>

          <div className="mt-6 flex-1 space-y-3 overflow-y-auto pb-3">
            <p className="font-[var(--font-poppins)] text-sm font-medium text-[var(--OffBlack)]/75">
              Saved forms
            </p>

            {forms.length === 0 ? (
              <div className="rounded-xl bg-white p-4 text-center shadow-sm">
                <p className="font-[var(--font-inter)] text-sm text-[var(--OffBlack)]/70">No saved forms yet.</p>
              </div>
            ) : (
              forms.map((form) => (
                <article key={form.id} className="rounded-xl bg-white p-4 shadow-sm">
                  <p className="font-[var(--font-poppins)] text-base font-medium">{form.title || 'Untitled Form'}</p>
                  <p className="mt-1 font-[var(--font-inter)] text-xs text-[var(--OffBlack)]/65">
                    {form.questions.length} questions
                  </p>
                  <div className="mt-3 flex justify-end">
                    <button
                      type="button"
                      onClick={() => setDeleteTarget(form)}
                      className="rounded-lg border border-red-400 px-3 py-1.5 font-[var(--font-poppins)] text-xs text-red-500"
                    >
                      Delete
                    </button>
                  </div>
                </article>
              ))
            )}
          </div>
        </section>
      </div>

      <Downbar />

      {deleteTarget ? (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/35 px-5">
          <div className="w-full max-w-[320px] rounded-2xl bg-white p-5 shadow-xl">
            <p className="font-[var(--font-poppins)] text-base font-medium text-[var(--OffBlack)]">Delete Form</p>
            <p className="mt-2 font-[var(--font-inter)] text-sm text-[var(--OffBlack)]/70">
              Are you sure you want to delete this form? This action cannot be undone.
            </p>

            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="rounded-lg border border-[color:var(--OffBlack)]/15 px-4 py-2 font-[var(--font-inter)] text-sm"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => deleteTarget && handleDelete(deleteTarget.id)}
                className="rounded-lg bg-red-600 px-4 py-2 font-[var(--font-inter)] text-sm text-white"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}