create table checkpd.thai_id_cards (
  thai_id text not null,
  user_id text null,
  title_th text null,
  title_en text null,
  full_name_th text null,
  full_name_en text null,
  first_name_th text null,
  first_name_en text null,
  last_name_th text null,
  last_name_en text null,
  date_of_birth text null,
  gender text null,
  card_issuer text null,
  issue_date text null,
  expire_date text null,
  address text null,
  photo_base64_uri text null,
  first_scanned_at timestamp with time zone not null default now(),
  last_scanned_at timestamp with time zone not null default now(),
  linked_at timestamp with time zone null,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  constraint thai_id_cards_pkey primary key (thai_id),
  constraint thai_id_cards_user_id_key unique (user_id),
  constraint thai_id_cards_user_id_fkey foreign KEY (user_id) references checkpd.users (id) on delete set null,
  constraint thai_id_cards_link_timestamp_check check (((user_id is null) = (linked_at is null))),
  constraint thai_id_cards_photo_base64_uri_check check (
    (
      (photo_base64_uri is null)
      or (
        photo_base64_uri ~* '^data:image/(jpeg|jpg|png);base64,'::text
      )
    )
  ),
  constraint thai_id_cards_gender_check check (
    (
      (gender is null)
      or (gender = any (array['M'::text, 'F'::text]))
    )
  ),
  constraint thai_id_cards_thai_id_check check ((thai_id ~ '^[0-9]{13}$'::text))
) TABLESPACE pg_default;

create index IF not exists idx_thai_id_cards_last_scanned_at on checkpd.thai_id_cards using btree (last_scanned_at desc) TABLESPACE pg_default;

create trigger trg_thai_id_cards_updated_at BEFORE
update on checkpd.thai_id_cards for EACH row
execute FUNCTION checkpd.set_thai_id_card_updated_at ();