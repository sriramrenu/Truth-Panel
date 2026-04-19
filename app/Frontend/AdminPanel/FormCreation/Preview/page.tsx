'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Swal from 'sweetalert2';

type AnswerValue = string | string[];

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

export default function FormPreviewPage() {
	const router = useRouter();
	const [form, setForm] = useState<TruthPanelForm | null>(null);
	const [currentIndex, setCurrentIndex] = useState(0);
	const [answers, setAnswers] = useState<Record<string, AnswerValue>>({});

	useEffect(() => {
		try {
			const draft = sessionStorage.getItem('truth_panel_draft');
			if (draft) {
				const parsed = JSON.parse(draft);
				setForm({
					id: parsed.id,
					title: parsed.title,
					description: parsed.description,
					createdAt: new Date().toISOString(),
					questions: parsed.questions,
				});
				setCurrentIndex(parsed.currentQuestionIndex || 0);
			}
		} catch {
		}
	}, []);

	const currentQuestion = form?.questions[currentIndex];

	const progress = useMemo(() => {
		if (!form || form.questions.length === 0) return 0;
		return ((currentIndex + 1) / form.questions.length) * 100;
	}, [form, currentIndex]);

	const isAnswered = (question?: FormQuestion) => {
		if (!question) return false;
		const answer = answers[question.id];

		if (question.type === 'checkboxes') {
			return Array.isArray(answer) && answer.length > 0;
		}

		return typeof answer === 'string' && answer.trim().length > 0;
	};

	const updateShortOrSingleAnswer = (questionId: string, value: string) => {
		setAnswers((prev) => ({ ...prev, [questionId]: value }));
	};

	const toggleCheckboxAnswer = (questionId: string, option: string) => {
		setAnswers((prev) => {
			const current = prev[questionId];
			const currentList = Array.isArray(current) ? current : [];

			const exists = currentList.includes(option);
			return {
				...prev,
				[questionId]: exists ? currentList.filter((item) => item !== option) : [...currentList, option],
			};
		});
	};

	if (!form) {
		return (
			<main className="min-h-screen bg-[var(--OffWhite)] text-[var(--OffBlack)]">
				<div className="mx-auto flex min-h-screen w-full max-w-[100%] flex-col items-center justify-center px-5 text-center">
					<p className="font-[var(--font-poppins)] text-xl font-medium">No form available for preview</p>
					<button
						type="button"
						onClick={() => router.push('/Frontend/AdminPanel/FormCreation/Builder')}
						className="mt-4 rounded-xl bg-[var(--PBlue)] px-4 py-2 font-[var(--font-poppins)] text-sm text-white"
					>
						Back to Builder
					</button>
				</div>
			</main>
		);
	}

	return (
		<main className="min-h-screen bg-white text-[var(--OffBlack)]">
			<div className="mx-auto flex min-h-screen w-full max-w-[100%] flex-col px-4 pb-6">
				<header className="pt-4">
					<div className="flex items-center justify-between">
						<button
							type="button"
							onClick={() => router.back()}
							className="flex h-9 w-9 items-center justify-center rounded-full border border-[color:var(--OffBlack)]/15 bg-[var(--OffWhite)] font-[var(--font-poppins)] text-lg"
							aria-label="Go back"
						>
							<img src="/BackArrow.svg" alt="Back" className="h-4 w-4 mr-[2px]" />
						</button>
						<span className="rounded-full bg-[var(--SYellow)] px-3 py-1 font-[var(--font-poppins)] text-xs font-medium text-[var(--OffBlack)]">
							Preview Mode
						</span>
					</div>

					<h1 className="mt-3 font-[var(--font-poppins)] text-xl font-medium text-[var(--OffBlack)]">
						{form.title || 'Untitled Form'}
					</h1>

					<div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-[var(--OffWhite)]">
						<div className="h-full rounded-full bg-[var(--PBlue)] transition-all" style={{ width: `${progress}%` }} />
					</div>
				</header>

				<section className="mt-5 flex-1">
					<article className="rounded-2xl border border-[color:var(--OffBlack)]/10 bg-[var(--OffWhite)] p-4 shadow-sm">
						<p className="font-[var(--font-poppins)] text-sm font-medium text-[var(--PBlue)]">
							Question {currentIndex + 1}
						</p>
						<p className="mt-2 font-[var(--font-poppins)] text-base font-medium text-[var(--OffBlack)]">
							{currentQuestion?.questionText}
						</p>

						<div className="mt-4 space-y-2">
							{currentQuestion?.type === 'multiple_choice'
								? (currentQuestion.options ?? []).map((option, optionIndex) => (
										<label
											key={`${currentQuestion.id}-mc-${optionIndex}-${option}`}
											className="flex items-center gap-2 rounded-lg border border-[color:var(--OffBlack)]/10 bg-white px-3 py-2"
										>
											<input
												type="radio"
												name={currentQuestion.id}
												value={option}
												checked={answers[currentQuestion.id] === option}
												onChange={(event) => updateShortOrSingleAnswer(currentQuestion.id, event.target.value)}
												className="accent-[var(--PBlue)]"
											/>
											<span className="font-[var(--font-inter)] text-sm">{option}</span>
										</label>
									))
								: null}

							{currentQuestion?.type === 'checkboxes'
								? (currentQuestion.options ?? []).map((option, optionIndex) => {
										const checked =
											Array.isArray(answers[currentQuestion.id]) &&
											(answers[currentQuestion.id] as string[]).includes(option);

										return (
											<label
												key={`${currentQuestion.id}-cb-${optionIndex}-${option}`}
												className="flex items-center gap-2 rounded-lg border border-[color:var(--OffBlack)]/10 bg-white px-3 py-2"
											>
												<input
													type="checkbox"
													checked={checked}
													onChange={() => toggleCheckboxAnswer(currentQuestion.id, option)}
													className="accent-[var(--PBlue)]"
												/>
												<span className="font-[var(--font-inter)] text-sm">{option}</span>
											</label>
										);
									})
								: null}

							{currentQuestion?.type === 'short_text' ? (
								<input
									type="text"
									value={typeof answers[currentQuestion.id] === 'string' ? (answers[currentQuestion.id] as string) : ''}
									onChange={(event) => updateShortOrSingleAnswer(currentQuestion.id, event.target.value)}
									placeholder="Type your answer"
									className="w-full rounded-lg border border-[color:var(--OffBlack)]/12 bg-white px-3 py-2.5 font-[var(--font-inter)] text-sm outline-none focus:border-[var(--PBlue)]"
								/>
							) : null}
						</div>
					</article>

					<div className="mt-4 flex items-center justify-between">
						<button
							type="button"
							disabled={currentIndex === 0}
							onClick={() => setCurrentIndex((prev) => Math.max(0, prev - 1))}
							className="rounded-lg border border-[color:var(--OffBlack)]/15 px-4 py-2 font-[var(--font-poppins)] text-sm disabled:cursor-not-allowed disabled:opacity-45"
						>
							Prev
						</button>

						<button
							type="button"
							disabled={currentIndex === form.questions.length - 1 || !isAnswered(currentQuestion)}
							onClick={() => setCurrentIndex((prev) => Math.min(form.questions.length - 1, prev + 1))}
							className="rounded-lg bg-[var(--PBlue)] px-4 py-2 font-[var(--font-poppins)] text-sm text-white disabled:cursor-not-allowed disabled:bg-gray-400"
						>
							Next
						</button>
					</div>
				</section>

				<footer className="space-y-2 pb-2 pt-3">
					<button
						type="button"
						onClick={() => router.push('/Frontend/AdminPanel/FormCreation/Builder')}
						className="w-full rounded-xl border border-[color:var(--PBlue)] bg-white px-4 py-3 font-[var(--font-poppins)] text-sm font-medium text-[var(--PBlue)]"
					>
						Back to Builder
					</button>

					<button
						type="button"
						onClick={async () => {
							try {
								const draft = sessionStorage.getItem('truth_panel_draft');
								if (draft) {
									const parsed = JSON.parse(draft);
									const { createSurvey, startLiveSession } = await import('../../../../../utils/api');
									const surveyRes = await createSurvey(
										parsed.title || 'Untitled', 
										parsed.description || '', 
										parsed.questions,
										parsed.startDateTime ? new Date(parsed.startDateTime).toISOString() : undefined,
										parsed.endDateTime ? new Date(parsed.endDateTime).toISOString() : undefined,
										parsed.pointsPerQuestion || 1
									);
									
									
									if (surveyRes.success && surveyRes.survey) {
										const sessionRes = await startLiveSession(surveyRes.survey.id);
										
										if (sessionRes?.success) {
											await Swal.fire({
												title: 'Survey Created!',
												text: 'Your survey is now live and assigned to the authorized participants.',
												icon: 'success',
												confirmButtonText: 'Great!',
												confirmButtonColor: '#1C69AE',
											});
										}
										sessionStorage.removeItem('truth_panel_draft');
									} else {
										console.error("Survey creation failed on backend", surveyRes.error);
									}
								}
							} catch (e) {
								console.error("Error during API request:", e);
							}
							router.replace('/Frontend/AdminPanel/Dashboard');
						}}
						className="w-full rounded-xl bg-[var(--PBlue)] px-4 py-3 font-[var(--font-poppins)] text-sm font-medium text-white"
					>
						Save &amp; Done
					</button>
				</footer>
			</div>
		</main>
	);
}
