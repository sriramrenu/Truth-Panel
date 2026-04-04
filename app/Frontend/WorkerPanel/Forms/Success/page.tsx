'use client';

import { useRouter } from 'next/navigation';

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
	answers: QuestionAnswer[];
}

const STORAGE_KEY = 'truth_panel_forms';

export default function SuccessPage() {
	const router = useRouter();

	return (
		<main className="min-h-screen bg-[var(--OffWhite)] text-[var(--OffBlack)]">
			<div className="mx-auto flex min-h-screen w-full max-w-[390px] flex-col items-center justify-center px-6 text-center">
				<div className="mb-5 flex h-20 w-20 items-center justify-center rounded-full bg-[color:rgba(28,105,174,0.1)]">
					<svg width="38" height="38" viewBox="0 0 24 24" fill="none" aria-hidden="true">
						<path
							d="M20 7L10 17L4 11"
							stroke="var(--PBlue)"
							strokeWidth="2.6"
							strokeLinecap="round"
							strokeLinejoin="round"
						/>
					</svg>
				</div>

				<h1 className="font-[var(--font-poppins)] text-2xl font-medium text-[var(--OffBlack)]">Form Submitted!</h1>
				<p className="mt-2 font-[var(--font-inter)] text-sm font-light text-[color:rgba(13,22,11,0.6)]">
					Your response has been recorded successfully.
				</p>

				<button
					type="button"
					onClick={() => router.push('/Frontend/WorkerPanel/Forms')}
					className="mt-8 w-full rounded-xl bg-[var(--PBlue)] px-4 py-3 font-[var(--font-poppins)] text-sm font-medium text-white"
				>
					Back to Forms
				</button>
			</div>
		</main>
	);
}
