-- share-images バケット作成（存在しない場合）
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'share-images',
  'share-images',
  true,                    -- パブリック読み取り（Twitter クローラーがアクセス可能）
  2097152,                 -- 2MB 上限
  array['image/png']       -- PNG のみ許可
)
on conflict (id) do update set
  public = true,
  file_size_limit = 2097152,
  allowed_mime_types = array['image/png'];

-- 認証済みユーザー: アップロード（INSERT）を許可
create policy "authenticated users can upload share images"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'share-images');

-- 認証済みユーザー: 上書き（UPDATE/upsert）を許可
create policy "authenticated users can update share images"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'share-images');

-- 全員: 読み取り（SELECT）を許可（Twitter クローラー含む）
create policy "public can read share images"
  on storage.objects for select
  to public
  using (bucket_id = 'share-images');

-- 認証済みユーザー: 自分がアップロードしたファイルを削除可能
create policy "authenticated users can delete share images"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'share-images');
