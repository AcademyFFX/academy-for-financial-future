alter table public.lms_courses
  add column if not exists department_name text,
  add column if not exists certification_title text,
  add column if not exists degree_pathway text;

alter table public.lms_course_certificates
  add column if not exists certification_name text;

drop policy if exists "Students can record own LMS course credits" on public.student_credits;
create policy "Students can record own LMS course credits"
on public.student_credits for insert to authenticated
with check (auth.uid() = student_id);

drop policy if exists "Students can insert own LMS degree progress" on public.student_degree_progress;
drop policy if exists "Students can update own LMS degree progress" on public.student_degree_progress;
create policy "Students can insert own LMS degree progress"
on public.student_degree_progress for insert to authenticated
with check (auth.uid() = student_id);
create policy "Students can update own LMS degree progress"
on public.student_degree_progress for update to authenticated
using (auth.uid() = student_id)
with check (auth.uid() = student_id);

insert into public.lms_courses (
  course_code, course_name, description, instructor_name, thumbnail_url,
  credit_hours, status, department_name, certification_title, degree_pathway
)
values
  (
    'AFF-PSY-201',
    'Trading Forex: The Management of Emotions Around Money',
    'Develop emotional self-awareness, disciplined decision-making, loss acceptance, risk consistency, and a professional relationship with money in the forex market.',
    'Dr. Jean Rene Moricette',
    '/course-thumbnails/trading-psychology-emotions-money.png',
    3,
    'Published',
    'Trading Psychology',
    'Certified Trading Psychology Practitioner (CTPP)',
    'Bachelor of Applied Trading Science'
  ),
  (
    'AFF-TMP-301',
    'Theology & Monetary Policy: How Spiritual Principles Shape Economic Realities',
    'Study stewardship, justice, moral responsibility, human dignity, debt, inflation, central banking, and monetary policy through economic, philosophical, theological, and civilizational perspectives.',
    'Dr. Jean Rene Moricette',
    '/course-thumbnails/theology-monetary-policy.png',
    4,
    'Published',
    'School of Economics, Philosophy & Civilization',
    'Certificate in Theology & Monetary Policy',
    'Doctorate of Financial Civilization Studies'
  )
on conflict (course_code) do update set
  course_name = excluded.course_name,
  description = excluded.description,
  thumbnail_url = excluded.thumbnail_url,
  credit_hours = excluded.credit_hours,
  status = excluded.status,
  department_name = excluded.department_name,
  certification_title = excluded.certification_title,
  degree_pathway = excluded.degree_pathway,
  updated_at = now();

with curriculum(course_code, module_order, module_title, module_description) as (
  values
    ('AFF-PSY-201', 1, 'Money, Meaning, and the Trading Mind', 'Identify the personal meanings, memories, expectations, and identity signals attached to money.'),
    ('AFF-PSY-201', 2, 'Fear, Greed, and Emotional Activation', 'Recognize fear, greed, urgency, euphoria, and avoidance before they control execution.'),
    ('AFF-PSY-201', 3, 'Loss Aversion and the Need to Be Right', 'Understand why losses feel disproportionate and why ego can override a valid trading plan.'),
    ('AFF-PSY-201', 4, 'Risk Perception and Position Sizing', 'Connect emotional stability to consistent risk percentages, position sizing, and capital protection.'),
    ('AFF-PSY-201', 5, 'FOMO, Impulse, and Overtrading', 'Interrupt fear of missing out, impulsive entries, revenge trading, and compulsive market monitoring.'),
    ('AFF-PSY-201', 6, 'Patience, Process, and Probabilistic Thinking', 'Replace outcome fixation with patience, sample-size thinking, and disciplined process measurement.'),
    ('AFF-PSY-201', 7, 'Emotional Regulation Under Volatility', 'Use practical regulation techniques before, during, and after high-volatility market events.'),
    ('AFF-PSY-201', 8, 'Trading Identity and Financial Self-Worth', 'Separate personal worth from profit, loss, account balance, and short-term performance.'),
    ('AFF-PSY-201', 9, 'Journaling, Review, and Behavioral Correction', 'Build a repeatable emotional journal, review loop, and behavior correction protocol.'),
    ('AFF-PSY-201', 10, 'The Professional Trading Psychology Plan', 'Integrate emotional rules, risk limits, routines, accountability, and recovery into a professional plan.'),
    ('AFF-TMP-301', 1, 'Theology, Economics, and the Meaning of Money', 'Frame money as a social, moral, institutional, and spiritual reality rather than a neutral object.'),
    ('AFF-TMP-301', 2, 'Stewardship, Ownership, and Human Responsibility', 'Examine stewardship, ownership, accountability, productive work, and responsibility across traditions.'),
    ('AFF-TMP-301', 3, 'Justice, Value, and Economic Exchange', 'Explore justice, fair exchange, pricing, labor, dignity, and the moral boundaries of markets.'),
    ('AFF-TMP-301', 4, 'Debt, Interest, and Moral Obligation', 'Study debt, interest, lending, repayment, mercy, exploitation, and institutional responsibility.'),
    ('AFF-TMP-301', 5, 'Inflation and the Ethics of Purchasing Power', 'Analyze inflation as policy, distribution, hidden burden, and a question of intergenerational justice.'),
    ('AFF-TMP-301', 6, 'Central Banks and Monetary Authority', 'Evaluate central-bank authority, independence, legitimacy, mandates, and public accountability.'),
    ('AFF-TMP-301', 7, 'Money Creation, Scarcity, and Abundance', 'Compare monetary creation, scarcity, abundance, discipline, trust, and the limits of financial expansion.'),
    ('AFF-TMP-301', 8, 'Monetary Policy and Human Flourishing', 'Connect employment, stability, growth, inequality, families, communities, and human flourishing.'),
    ('AFF-TMP-301', 9, 'Economic Crisis, Mercy, and Institutional Response', 'Assess crisis intervention, relief, austerity, moral hazard, solidarity, and long-term responsibility.'),
    ('AFF-TMP-301', 10, 'Toward a Moral Monetary Framework', 'Synthesize spiritual principles, ethical governance, economic evidence, and responsible policy design.')
)
insert into public.lms_modules (course_id, module_title, module_description, module_order)
select course.id, curriculum.module_title, curriculum.module_description, curriculum.module_order
from curriculum
join public.lms_courses course on course.course_code = curriculum.course_code
on conflict (course_id, module_order) do update set
  module_title = excluded.module_title,
  module_description = excluded.module_description,
  updated_at = now();

with curriculum(course_code, module_order, lesson_title, lesson_description) as (
  values
    ('AFF-PSY-201', 1, 'Your Emotional Money Map', 'Create a personal map of money beliefs, formative experiences, trading expectations, and emotional triggers.'),
    ('AFF-PSY-201', 2, 'Reading Emotional Signals Before Entry', 'Use physical, cognitive, and behavioral signals to identify emotional activation before placing a trade.'),
    ('AFF-PSY-201', 3, 'Accepting Loss Without Identity Collapse', 'Practice planned loss acceptance and remove the need to prove that every analysis must be correct.'),
    ('AFF-PSY-201', 4, 'Risk Consistency as Emotional Protection', 'Apply fixed risk rules and position sizing as safeguards against emotionally distorted decisions.'),
    ('AFF-PSY-201', 5, 'Breaking the FOMO and Revenge Cycle', 'Use pause rules, entry criteria, and session limits to stop impulsive and retaliatory trading.'),
    ('AFF-PSY-201', 6, 'Thinking in Probabilities', 'Evaluate execution over a series of trades instead of judging skill by one outcome.'),
    ('AFF-PSY-201', 7, 'The Volatility Regulation Protocol', 'Build a breathing, posture, decision-delay, and exposure-reduction protocol for volatile conditions.'),
    ('AFF-PSY-201', 8, 'Profit, Loss, and Personal Worth', 'Build an identity anchored in character, preparation, and discipline rather than financial fluctuation.'),
    ('AFF-PSY-201', 9, 'The Emotional Trading Journal', 'Record triggers, decisions, rule adherence, recovery, and corrective actions in a professional journal.'),
    ('AFF-PSY-201', 10, 'CTPP Professional Practice Plan', 'Complete a personal trading psychology constitution and professional accountability plan.'),
    ('AFF-TMP-301', 1, 'Why Money Is Never Merely Technical', 'Study money as trust, promise, measurement, power, relationship, and moral institution.'),
    ('AFF-TMP-301', 2, 'Stewardship and the Purpose of Economic Power', 'Connect resources and authority to service, accountability, productive responsibility, and the common good.'),
    ('AFF-TMP-301', 3, 'Justice in Markets and Institutions', 'Evaluate voluntary exchange, unequal power, human dignity, labor, and institutional fairness.'),
    ('AFF-TMP-301', 4, 'Debt, Interest, Mercy, and Discipline', 'Compare ethical concerns around debt with the need for trust, discipline, credit, and productive investment.'),
    ('AFF-TMP-301', 5, 'Who Bears the Cost of Inflation?', 'Trace how inflation affects savers, workers, debtors, families, asset owners, and future generations.'),
    ('AFF-TMP-301', 6, 'Central Banking as Moral Authority', 'Analyze central-bank mandates and the ethical consequences of decisions made at institutional scale.'),
    ('AFF-TMP-301', 7, 'Money Supply, Trust, and Restraint', 'Study monetary expansion and contraction through credibility, scarcity, restraint, and social confidence.'),
    ('AFF-TMP-301', 8, 'Policy for Human Flourishing', 'Assess monetary policy by its effects on stability, opportunity, dignity, family life, and community resilience.'),
    ('AFF-TMP-301', 9, 'Responding to Crisis Without Losing Principle', 'Examine emergency policy, relief, responsibility, moral hazard, and institutional legitimacy.'),
    ('AFF-TMP-301', 10, 'A Theology and Monetary Policy Charter', 'Develop a moral monetary policy charter integrating evidence, humility, justice, stewardship, and accountability.')
)
insert into public.lms_lessons (
  course_id, module_id, lesson_title, lesson_description,
  lesson_order, estimated_minutes, status
)
select course.id, module.id, curriculum.lesson_title, curriculum.lesson_description, 1, 35, 'Published'
from curriculum
join public.lms_courses course on course.course_code = curriculum.course_code
join public.lms_modules module on module.course_id = course.id and module.module_order = curriculum.module_order
on conflict (module_id, lesson_order) do update set
  lesson_title = excluded.lesson_title,
  lesson_description = excluded.lesson_description,
  estimated_minutes = excluded.estimated_minutes,
  status = excluded.status,
  updated_at = now();

insert into public.lms_quizzes (course_id, quiz_title, questions, passing_score, status)
select id,
  'CTPP Certification Assessment',
  '[
    {"prompt":"What is the most professional response to a planned trading loss?","options":["Increase risk immediately","Accept it within the plan and review execution","Avoid the journal","Move the stop after entry"],"correctAnswer":"Accept it within the plan and review execution"},
    {"prompt":"What best interrupts revenge trading?","options":["More leverage","A mandatory pause and session loss limit","A new indicator","Ignoring emotion"],"correctAnswer":"A mandatory pause and session loss limit"},
    {"prompt":"Why is fixed percentage risk psychologically useful?","options":["It guarantees profit","It reduces emotional variability and protects capital","It predicts price","It removes all losses"],"correctAnswer":"It reduces emotional variability and protects capital"},
    {"prompt":"Professional probabilistic thinking evaluates performance over what?","options":["One trade","A meaningful sample of rule-based trades","One winning day","Social media opinions"],"correctAnswer":"A meaningful sample of rule-based trades"}
  ]'::jsonb,
  80,
  'Published'
from public.lms_courses where course_code = 'AFF-PSY-201'
and not exists (select 1 from public.lms_quizzes q where q.course_id = lms_courses.id and q.quiz_title = 'CTPP Certification Assessment');

insert into public.lms_quizzes (course_id, quiz_title, questions, passing_score, status)
select id,
  'Theology & Monetary Policy Final Assessment',
  '[
    {"prompt":"Which principle best connects monetary authority with moral responsibility?","options":["Power without accountability","Stewardship and public accountability","Unlimited expansion","Secrecy as a virtue"],"correctAnswer":"Stewardship and public accountability"},
    {"prompt":"Inflation raises ethical questions because it affects what?","options":["Only central banks","The distribution of purchasing power across society","Only currency traders","Only government accounting"],"correctAnswer":"The distribution of purchasing power across society"},
    {"prompt":"A human-flourishing approach evaluates policy by what?","options":["Market movement alone","Stability, dignity, opportunity, families, and communities","Only asset prices","Only money supply"],"correctAnswer":"Stability, dignity, opportunity, families, and communities"},
    {"prompt":"Responsible crisis policy must balance intervention with what?","options":["Moral hazard and long-term accountability","Permanent emergency","No evidence","Unlimited debt"],"correctAnswer":"Moral hazard and long-term accountability"}
  ]'::jsonb,
  80,
  'Published'
from public.lms_courses where course_code = 'AFF-TMP-301'
and not exists (select 1 from public.lms_quizzes q where q.course_id = lms_courses.id and q.quiz_title = 'Theology & Monetary Policy Final Assessment');

insert into public.course_credits (course_code, course_title, course_category, credits)
values
  ('AFF-PSY-201', 'Trading Forex: The Management of Emotions Around Money', 'Trading Psychology', 3),
  ('AFF-TMP-301', 'Theology & Monetary Policy: How Spiritual Principles Shape Economic Realities', 'Economics, Philosophy & Civilization', 4)
on conflict (course_code) do update set
  course_title = excluded.course_title,
  course_category = excluded.course_category,
  credits = excluded.credits;

insert into public.university_colleges (college_name, college_code, description, dean_name, display_order, college_status)
values ('School of Economics, Philosophy & Civilization', 'SEPC', 'Interdisciplinary study of economic systems, monetary institutions, moral philosophy, theology, and civilization.', 'Dr. Jean Rene Moricette', 8, 'Active')
on conflict (college_name) do update set description = excluded.description, dean_name = excluded.dean_name;

insert into public.university_programs (college_id, college_name, program_name, credential_type, description, credit_hours_required, program_status)
select college.id, seed.college_name, seed.program_name, 'Professional Certification', seed.description, seed.credits, 'Active'
from public.university_colleges college
join (values
  ('College of Financial Markets', 'Certified Trading Psychology Practitioner (CTPP)', 'Professional training in emotional regulation, money psychology, risk consistency, and disciplined trading behavior.', 3),
  ('School of Economics, Philosophy & Civilization', 'Certificate in Theology & Monetary Policy', 'Interdisciplinary study of moral responsibility, spiritual principles, monetary institutions, and economic realities.', 4)
) as seed(college_name, program_name, description, credits) on seed.college_name = college.college_name
where not exists (select 1 from public.university_programs existing where existing.program_name = seed.program_name);

insert into public.degree_requirements (degree_program_id, requirement_name, requirement_category, credits_required, display_order)
select degree.id, seed.requirement_name, seed.requirement_category, seed.credits_required, seed.display_order
from public.academic_degree_programs degree
join (values
  ('AFF-BATS', 'Trading Psychology and Emotional Discipline', 'Major', 3, 5),
  ('AFF-DFCS', 'Theology, Monetary Policy, and Moral Economy', 'Major', 4, 5)
) as seed(degree_id, requirement_name, requirement_category, credits_required, display_order) on seed.degree_id = degree.degree_id
where not exists (
  select 1 from public.degree_requirements existing
  where existing.degree_program_id = degree.id and existing.requirement_name = seed.requirement_name
);

notify pgrst, 'reload schema';
