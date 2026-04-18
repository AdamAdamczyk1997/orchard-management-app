create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.derive_season_year_from_date(input_date date)
returns integer
language sql
immutable
as $$
  select extract(year from input_date)::integer
$$;

create or replace function public.normalize_harvest_quantity_to_kg(
  input_value numeric,
  input_unit text
)
returns numeric
language plpgsql
immutable
as $$
begin
  if input_value is null or input_unit is null then
    return null;
  end if;

  case input_unit
    when 'kg' then
      return input_value;
    when 't' then
      return input_value * 1000;
    else
      raise exception 'Unsupported harvest quantity unit: %', input_unit
        using errcode = '23514';
  end case;
end;
$$;
