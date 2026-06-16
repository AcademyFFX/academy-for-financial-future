alter table public.tv_broadcasts
  drop constraint if exists tv_broadcasts_category_check;

alter table public.tv_broadcasts
  add constraint tv_broadcasts_category_check check (
    category in (
      'Live Broadcast',
      'Recorded Masterclass',
      'Student Interview',
      'Market Outlook Show',
      'Community Awareness TV',
      'Destiny Alignment TV',
      'Eyes on Society TV',
      'Educational VOD'
    )
  );

insert into public.tv_broadcasts (
  title,
  show_name,
  category,
  description,
  thumbnail_url,
  scheduled_at,
  duration_minutes,
  host_name,
  status,
  access_level
)
select
  'Eyes on Society TV: Issues, Ideas, and Opportunities',
  'Eyes on Society TV',
  'Eyes on Society TV',
  'Exploring the issues, ideas, challenges, and opportunities shaping modern society through education, economic awareness, leadership, governance, community development, technology, culture, youth development, public policy, and social responsibility.',
  null,
  now() + interval '6 days',
  55,
  'Dr. Jean R. Moricette',
  'Scheduled',
  'Public'
where not exists (
  select 1
  from public.tv_broadcasts
  where show_name = 'Eyes on Society TV'
    and category = 'Eyes on Society TV'
);

insert into public.broadcast_network_divisions (division_name, description, display_order)
values
  ('Eyes on Society TV', 'Exploring the issues, ideas, challenges, and opportunities shaping modern society.', 6)
on conflict (division_name) do update set
  description = excluded.description,
  display_order = excluded.display_order;

insert into public.broadcast_programs (division_id, division_name, program_name, program_type, description, host_name)
select division.id, seed.division_name, seed.program_name, seed.program_type, seed.description, 'Dr. Jean R. Moricette'
from public.broadcast_network_divisions division
join (
  values
    ('Eyes on Society TV', 'Education & Literacy', 'Social Issues', 'Exploring education access, literacy, learning equity, and public knowledge.'),
    ('Eyes on Society TV', 'Economic Awareness', 'Social Issues', 'Economic education, household finance, employment, opportunity, and social mobility.'),
    ('Eyes on Society TV', 'Leadership & Governance', 'Public Affairs', 'Leadership decisions, governance questions, public trust, and institutional accountability.'),
    ('Eyes on Society TV', 'Community Development', 'Community Reports', 'Community growth, neighborhood needs, service projects, and local transformation.'),
    ('Eyes on Society TV', 'Technology & Society', 'Technology and Culture', 'How technology, AI, platforms, and innovation affect modern society.'),
    ('Eyes on Society TV', 'Media & Culture', 'Media and Culture', 'Culture, media narratives, communication, and public understanding.'),
    ('Eyes on Society TV', 'Youth Development', 'Youth Development', 'Youth leadership, mentorship, discipline, education, and future readiness.'),
    ('Eyes on Society TV', 'Financial Literacy', 'Financial Literacy', 'Financial literacy as a civic and social responsibility.'),
    ('Eyes on Society TV', 'Public Policy Discussions', 'Public Policy', 'Public policy dialogue, issue framing, evidence, and institutional choices.'),
    ('Eyes on Society TV', 'Social Responsibility', 'Social Responsibility', 'Moral responsibility, service, community stewardship, and social impact.')
) as seed(division_name, program_name, program_type, description) on seed.division_name = division.division_name
on conflict (division_name, program_name) do update set
  program_type = excluded.program_type,
  description = excluded.description,
  host_name = excluded.host_name;

insert into public.broadcast_analytics (division_name, program_name, views, watch_time_minutes, subscribers, engagement_score)
values
  ('Eyes on Society TV', 'Education & Literacy', 980, 2680, 244, 84.5),
  ('Eyes on Society TV', 'Public Policy Discussions', 720, 1985, 188, 81.0),
  ('Eyes on Society TV', 'Community Development', 690, 1740, 172, 80.5)
on conflict do nothing;

notify pgrst, 'reload schema';
