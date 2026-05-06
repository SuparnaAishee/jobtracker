import { useEffect, useRef, useState } from 'react';
import { Layout } from '../components/Layout';
import * as users from '../api/users';
import * as resumes from '../api/resumes';
import { HttpError } from '../api/client';

export function SettingsPage() {
  const [profile, setProfile] = useState<users.UserProfile | null>(null);
  const [profileErr, setProfileErr] = useState<string | null>(null);
  const [savingProfile, setSavingProfile] = useState(false);

  const [list, setList] = useState<resumes.Resume[]>([]);
  const [resumeErr, setResumeErr] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const [label, setLabel] = useState('');

  const reloadProfile = () => users.me().then(setProfile).catch((e) => setProfileErr(e.message));
  const reloadResumes = () => resumes.list().then(setList).catch((e) => setResumeErr(e.message));

  useEffect(() => {
    reloadProfile();
    reloadResumes();
  }, []);

  const saveProfile = async (isPublic: boolean, slug: string | null) => {
    setSavingProfile(true);
    setProfileErr(null);
    try {
      const next = await users.updatePublicProfile(isPublic, slug);
      setProfile(next);
    } catch (err) {
      if (err instanceof HttpError) {
        const messages = err.body?.errors
          ? Object.values(err.body.errors).flat().join(' ')
          : err.body?.detail ?? err.body?.title ?? err.message;
        setProfileErr(messages);
      } else if (err instanceof Error) setProfileErr(err.message);
    } finally {
      setSavingProfile(false);
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fileRef.current?.files?.[0]) return;
    setUploading(true);
    setResumeErr(null);
    try {
      await resumes.upload(fileRef.current.files[0], label);
      setLabel('');
      if (fileRef.current) fileRef.current.value = '';
      await reloadResumes();
    } catch (err) {
      setResumeErr(err instanceof Error ? err.message : 'Upload failed.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <Layout>
      <div className="mb-8">
        <p className="mb-1 text-xs font-medium uppercase tracking-wider text-accent-600 dark:text-accent-400">
          Settings
        </p>
        <h1 className="text-3xl font-semibold tracking-tight text-ink-900 dark:text-ink-50">
          Profile & resumes
        </h1>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="card p-6">
          <h2 className="mb-1 text-lg font-semibold text-ink-900 dark:text-ink-50">Public profile</h2>
          <p className="mb-5 text-sm text-ink-600 dark:text-ink-400">
            Share an anonymized stats page at <span className="font-mono">/u/&lt;slug&gt;</span> — no company names or notes, just funnel + counts.
          </p>

          {profileErr && (
            <div className="mb-3 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300">
              {profileErr}
            </div>
          )}

          {profile && (
            <ProfileForm
              profile={profile}
              saving={savingProfile}
              onSave={saveProfile}
            />
          )}
        </div>

        <div className="card p-6">
          <h2 className="mb-1 text-lg font-semibold text-ink-900 dark:text-ink-50">Resumes</h2>
          <p className="mb-5 text-sm text-ink-600 dark:text-ink-400">
            Upload PDF / DOC / DOCX / TXT / MD up to 5 MB. Files are stored on the server (mounted volume).
          </p>

          <form onSubmit={handleUpload} className="mb-4 space-y-3">
            <input
              ref={fileRef}
              type="file"
              accept=".pdf,.doc,.docx,.txt,.md,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain,text/markdown"
              className="block w-full text-sm text-ink-600 file:mr-3 file:rounded-md file:border-0 file:bg-ink-900 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-white hover:file:bg-ink-800 dark:text-ink-400 dark:file:bg-accent-500 dark:file:text-white dark:hover:file:bg-accent-400"
            />
            <input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder='Optional label (e.g. "Backend-focused 2026")'
              className="input"
            />
            <button type="submit" disabled={uploading} className="btn-primary">
              {uploading ? 'Uploading…' : 'Upload resume'}
            </button>
          </form>

          {resumeErr && (
            <div className="mb-3 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300">
              {resumeErr}
            </div>
          )}

          <ul className="divide-y divide-ink-100 dark:divide-ink-800">
            {list.length === 0 ? (
              <li className="py-4 text-sm text-ink-500">No resumes yet.</li>
            ) : (
              list.map((r) => (
                <li key={r.id} className="flex items-center justify-between py-3">
                  <div className="min-w-0">
                    <div className="truncate font-medium text-ink-900 dark:text-ink-100">{r.label}</div>
                    <div className="truncate text-xs text-ink-500">
                      {r.originalFileName} · {(r.sizeBytes / 1024).toFixed(0)} KB · {new Date(r.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <a
                      href={resumes.downloadUrl(r.id)}
                      className="text-xs font-medium text-accent-600 hover:underline dark:text-accent-400"
                    >
                      Download
                    </a>
                    <button
                      onClick={async () => {
                        if (!confirm('Delete this resume?')) return;
                        await resumes.remove(r.id);
                        await reloadResumes();
                      }}
                      className="text-xs font-medium text-ink-500 hover:text-rose-600 dark:text-ink-400 dark:hover:text-rose-400"
                    >
                      Delete
                    </button>
                  </div>
                </li>
              ))
            )}
          </ul>
        </div>
      </div>
    </Layout>
  );
}

function ProfileForm({
  profile,
  saving,
  onSave
}: {
  profile: users.UserProfile;
  saving: boolean;
  onSave: (isPublic: boolean, slug: string | null) => Promise<void>;
}) {
  const [isPublic, setIsPublic] = useState(profile.isPublic);
  const [slug, setSlug] = useState(profile.publicSlug ?? '');

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSave(isPublic, slug.trim() ? slug.trim() : null);
      }}
      className="space-y-4"
    >
      <label className="flex items-start gap-3">
        <input
          type="checkbox"
          checked={isPublic}
          onChange={(e) => setIsPublic(e.target.checked)}
          className="mt-1 h-4 w-4 rounded border-ink-300 text-accent-600 focus:ring-accent-500"
        />
        <span>
          <span className="block font-medium text-ink-900 dark:text-ink-100">Make my profile public</span>
          <span className="block text-xs text-ink-500 dark:text-ink-400">
            Anyone with the link sees only aggregate stats — no companies, positions, or notes.
          </span>
        </span>
      </label>

      <label className="block">
        <span className="label">Public slug</span>
        <div className="flex items-stretch gap-0">
          <span className="inline-flex items-center rounded-l-md border border-r-0 border-ink-200 bg-ink-50 px-3 text-xs text-ink-500 dark:border-ink-800 dark:bg-ink-950 dark:text-ink-500">
            /u/
          </span>
          <input
            value={slug}
            onChange={(e) => setSlug(e.target.value.toLowerCase())}
            className="input rounded-l-none"
            placeholder="your-handle"
          />
        </div>
      </label>

      <div className="flex items-center justify-between">
        <button type="submit" disabled={saving} className="btn-primary">
          {saving ? 'Saving…' : 'Save'}
        </button>
        {profile.isPublic && profile.publicSlug && (
          <a
            href={`/u/${profile.publicSlug}`}
            className="text-sm font-medium text-accent-600 hover:underline dark:text-accent-400"
            target="_blank"
            rel="noopener noreferrer"
          >
            View public profile →
          </a>
        )}
      </div>
    </form>
  );
}
