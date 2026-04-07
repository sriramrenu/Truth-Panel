'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
	Bar,
	BarChart,
	Cell,
	Legend,
	Pie,
	PieChart,
	ResponsiveContainer,
	Tooltip,
	XAxis,
	YAxis,
} from 'recharts';
import Downbar from '../../../Components/Downbar';
import Navbar from '../../../Components/Navbar';

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

const PIE_COLORS = ['#1C69AE', '#f5c518', '#4CAF50', '#E91E63', '#9C27B0', '#FF5722'];

const getPieColor = (index: number) => {
	if (index < PIE_COLORS.length) return PIE_COLORS[index];

	// Generate additional distinct colors using golden-angle hue steps.
	const hue = Math.round((index * 137.508) % 360);
	return `hsl(${hue}, 68%, 52%)`;
};

const formatSubmittedAt = (value: string) =>
	new Intl.DateTimeFormat('en-US', {
		month: 'short',
		day: 'numeric',
		year: 'numeric',
		hour: 'numeric',
		minute: '2-digit',
	}).format(new Date(value));

export default function FormAnalyticsPage() {
	const router = useRouter();
	const params = useParams();
	const formId = Array.isArray(params.id) ? params.id[0] : params.id;
	const [form, setForm] = useState<TruthPanelForm | null>(null);
	const [responses, setResponses] = useState<FormResponse[]>([]);
	const [isMounted, setIsMounted] = useState(false);
	const [expandedResponseId, setExpandedResponseId] = useState<string | null>(null);

	useEffect(() => {
		setIsMounted(true);
	}, []);

	useEffect(() => {
		if (!isMounted || !formId) return;

		const loadData = async () => {
			try {
				const { fetchAllSurveys, fetchSurveyAnalytics } = await import('../../../../../utils/api');
				
				// Load Survey from backend
				const surveysRes = await fetchAllSurveys();
				if (surveysRes?.success) {
					const found = (surveysRes.data || []).find((s: any) => s.id === formId);
					if (found) {
						setForm({
							id: found.id,
							title: found.title,
							description: found.description || '',
							createdAt: found.created_at,
							questions: (found.Questions || []).map((q: any) => ({
								id: q.id,
								type: q.question_type === 'MCQ' ? 'multiple_choice' : q.question_type,
								questionText: q.question_text,
								options: q.options || [],
							})),
						});
					}
				}
				
				// Load aggregated responses spanning sessions from backend 
				const analyticsRes = await fetchSurveyAnalytics(formId);
				if (analyticsRes?.success && Array.isArray(analyticsRes.data)) {
                    const groupedResponses: Record<string, FormResponse> = {};
                    analyticsRes.data.forEach((r: any) => {
                        const userId = r.user_id || 'worker';
                        const wName = r.user_id ? r.user_id.split('-')[0] : 'Worker';
                        if (!groupedResponses[userId]) {
                           groupedResponses[userId] = {
                               responseId: r.id || userId, 
                               formId: formId,
                               formTitle: '',
                               submittedAt: r.submitted_at || r.created_at,
                               workerEmail: userId,
                               workerName: `Worker ${wName}`,
                               answers: []
                           };
                        }
                        groupedResponses[userId].answers.push({
                             questionId: r.question_id,
                             questionText: r.Questions?.question_text || '',
                             answer: r.answer
                        });
                    });
                    
					setResponses(Object.values(groupedResponses));
				}
			} catch (err) {
				console.error('Failed to load analytics data', err);
				setForm(null);
				setResponses([]);
			}
		};
		loadData();
	}, [formId, isMounted]);

	const getAnswersForQuestion = (questionId: string): string[] =>
		responses
			.map((response) => response.answers.find((answer) => answer.questionId === questionId)?.answer)
			.filter((answer): answer is string => typeof answer === 'string' && answer.trim() !== '');

	if (!isMounted) {
		return (
			<main className="min-h-screen bg-[var(--OffWhite)] text-[var(--OffBlack)]">
				<div className="mx-auto min-h-screen w-full max-w-[390px]" />
			</main>
		);
	}

	if (!form) {
		return (
			<main className="min-h-screen bg-[var(--OffWhite)] text-[var(--OffBlack)]">
				<div className="mx-auto flex min-h-screen w-full max-w-[390px] flex-col pb-28">
					<Navbar />
					<div className="flex flex-1 items-center justify-center px-4 text-center">
						<div>
							<p className="font-[var(--font-poppins)] text-lg font-medium text-[var(--OffBlack)]">Form not found</p>
							<button
								type="button"
								onClick={() => router.push('/Frontend/AdminPanel/Forms')}
								className="mt-4 rounded-xl bg-[var(--PBlue)] px-4 py-2 font-[var(--font-poppins)] text-sm text-white"
							>
								Back to Forms
							</button>
						</div>
					</div>
					<Downbar />
				</div>
			</main>
		);
	}

	return (
		<main className="min-h-screen bg-[var(--OffWhite)] text-[var(--OffBlack)]">
			<div className="mx-auto flex min-h-screen w-full max-w-[390px] flex-col pb-28">
				<Navbar />

				<section className="flex-1 px-4 pt-4">
					<header className="flex items-start gap-3">
						<button
							type="button"
							onClick={() => router.push('/Frontend/AdminPanel/Forms')}
							className="mt-0.5 flex h-9 w-9 items-center justify-center rounded-full border border-[color:var(--OffBlack)]/15 bg-white font-[var(--font-poppins)] text-lg"
							aria-label="Back to forms"
						>
							{'<'}
						</button>

						<div className="min-w-0 flex-1">
							<h1 className="truncate font-[var(--font-poppins)] text-xl font-medium text-[var(--OffBlack)]">
								{form.title || 'Untitled Form'}
							</h1>
							<p className="mt-1 font-[var(--font-inter)] text-sm text-[var(--OffBlack)]/70">
								{form.questions.length} questions
							</p>
						</div>

						<span className="rounded-full bg-[var(--PBlue)] px-3 py-1 font-[var(--font-poppins)] text-xs font-medium text-white">
							{responses.length} Responses
						</span>
					</header>

					{responses.length === 0 ? (
						<div className="flex min-h-[55vh] items-center justify-center px-4 text-center">
							<div>
								<p className="font-[var(--font-poppins)] text-lg font-medium text-[var(--OffBlack)]">No responses yet</p>
								<p className="mt-2 font-[var(--font-inter)] text-sm text-[var(--OffBlack)]/70">
									Responses will appear here once workers submit this form.
								</p>
							</div>
						</div>
					) : (
						<div className="mt-5 space-y-4">
							{form.questions.map((question, index) => {
								const questionNumber = index + 1;
								const textAnswers = getAnswersForQuestion(question.id);

								const pieData =
									(question.options ?? [])
										.map((option) => ({
											name: option,
											value: textAnswers.filter((answer) => answer === option).length,
										}))
										.filter((entry) => entry.value > 0);

								const allSelected: string[] = responses.flatMap((response) => {
									const answer = response.answers.find((item) => item.questionId === question.id)?.answer;
									if (typeof answer === 'string') {
                                        return answer.split(',').map(s => s.trim());
                                    }
									return Array.isArray(answer) ? answer : [];
								});

								const barData =
									question.options?.map((option) => ({
										name: option,
										count: allSelected.filter((item) => item === option).length,
									})) ?? [];

								return (
									<article key={question.id} className="rounded-2xl bg-white p-4 shadow-sm">
										<p className="font-[var(--font-inter)] text-xs font-light text-[var(--PBlue)]">Q{questionNumber}</p>
										<h2 className="mt-1 font-[var(--font-poppins)] text-base font-medium text-[var(--OffBlack)]">
											{question.questionText}
										</h2>

										{question.type === 'multiple_choice' ? (
											<div className="mt-3 h-[300px] w-full">
												{isMounted ? (
													<ResponsiveContainer width="100%" height={300}>
														<PieChart>
															<Pie
																data={pieData}
																dataKey="value"
																nameKey="name"
																cx="20%"
																cy="40%"
																outerRadius={80}
															>
																	{pieData.map((_, pieIndex) => (
																		<Cell key={`cell-${pieIndex}`} fill={getPieColor(pieIndex)} />
																	))}
															</Pie>
															<Tooltip
																formatter={(value, name) => {
																	const total = pieData.reduce((sum, item) => sum + item.value, 0);
																	const numericValue = Number(value ?? 0);
																	const percent = total > 0 ? ((numericValue / total) * 100).toFixed(0) : '0';
																	return [`${numericValue} responses (${percent}%)`, String(name)];
																}}
																contentStyle={{
																	fontFamily: 'var(--font-inter)',
																	fontSize: '12px',
																	borderRadius: '8px',
																}}
															/>
															<Legend
																formatter={(value, entry) => {
																	const total = pieData.reduce((sum, item) => sum + item.value, 0);
																	const payloadValue = Number((entry?.payload as { value?: number } | undefined)?.value ?? 0);
																	const percent = total > 0 ? ((payloadValue / total) * 100).toFixed(0) : '0';

																	return (
																		<span
																			style={{
																				fontFamily: 'var(--font-inter)',
																				fontSize: '12px',
																				color: 'var(--OffBlack)',
																			}}
																		>
																			{value} -- {percent}% ({payloadValue})
																		</span>
																	);
																}}
																layout="vertical"
																align="left"
																iconType="circle"
																iconSize={8}
																wrapperStyle={{ paddingTop: '12px', lineHeight: '24px' }}
															/>
														</PieChart>
													</ResponsiveContainer>
												) : null}
											</div>
										) : null}

										{question.type === 'checkboxes' ? (
											<div className="mt-3 h-[220px] w-full">
												{isMounted ? (
													<ResponsiveContainer width="100%" height={220}>
														<BarChart data={barData} margin={{ top: 8, right: 8, left: -20, bottom: 8 }}>
															<XAxis dataKey="name" tick={{ fontSize: 10, fontFamily: 'var(--font-inter)' }} />
															<YAxis allowDecimals={false} />
															<Tooltip />
															<Bar dataKey="count" fill="#1C69AE" radius={[6, 6, 0, 0]} />
														</BarChart>
													</ResponsiveContainer>
												) : null}
											</div>
										) : null}

										{question.type === 'short_text' ? (
											<div className="mt-3 flex flex-wrap gap-2">
												{textAnswers.length === 0 ? (
													<p className="font-[var(--font-inter)] text-sm text-[var(--OffBlack)]/50">No answers yet</p>
												) : (
													textAnswers.map((answer, answerIndex) => (
														<span
															key={`${question.id}-answer-${answerIndex}`}
															className="rounded-full border border-[color:var(--PBlue)]/20 bg-[var(--OffWhite)] px-3 py-1 font-[var(--font-inter)] text-sm text-[var(--OffBlack)]"
														>
															{answer}
														</span>
													))
												)}
											</div>
										) : null}
									</article>
								);
							})}

							<section className="rounded-2xl bg-white p-4 shadow-sm">
								<h2 className="font-[var(--font-poppins)] text-base font-medium text-[var(--OffBlack)]">
									Individual Responses
								</h2>

								<div className="mt-3 space-y-3">
									{responses.map((response) => {
										const expanded = expandedResponseId === response.responseId;

										return (
											<div key={response.responseId} className="rounded-xl border border-[color:var(--OffBlack)]/10">
												<button
													type="button"
													onClick={() =>
														setExpandedResponseId((current) =>
															current === response.responseId ? null : response.responseId,
														)
													}
													className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
												>
													<div>
														<p className="font-[var(--font-poppins)] text-sm font-medium text-[var(--OffBlack)]">
															{response.workerName}
														</p>
														<p className="mt-1 font-[var(--font-inter)] text-xs text-[var(--OffBlack)]/60">
															{formatSubmittedAt(response.submittedAt)}
														</p>
													</div>
													<span className="font-[var(--font-poppins)] text-lg text-[var(--PBlue)]">
														{expanded ? '⌃' : '⌄'}
													</span>
												</button>

												{expanded ? (
													<div className="border-t border-[color:var(--OffBlack)]/10 px-4 py-3">
														<div className="space-y-3">
															{response.answers.map((answer) => (
																<div key={answer.questionId}>
																	<p className="font-[var(--font-inter)] text-xs text-[var(--OffBlack)]/60">{answer.questionText}</p>
																	<p className="mt-1 font-[var(--font-poppins)] text-sm font-normal text-[var(--OffBlack)]">
																		{Array.isArray(answer.answer) ? answer.answer.join(', ') : answer.answer || 'No answer'}
																	</p>
																</div>
															))}
														</div>
													</div>
												) : null}
											</div>
										);
									})}
								</div>
							</section>
						</div>
					)}
				</section>
			</div>

			<Downbar />
		</main>
	);
}