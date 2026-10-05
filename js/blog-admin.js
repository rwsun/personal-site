// blog-admin.html: the form for adding blog cards (title, date, photo,
// journal). With Supabase set up, only BLOG_OWNER_EMAIL can sign in and post;
// photos go to the "blog-photos" storage bucket and entries to the blog_posts
// table. Without it, entries are saved in this browser only, for trying it out.

const LOCAL_KEY = "blog-entries"; // must match js/blog.js
const MAX_JOURNAL = 300;
const BUCKET = "blog-photos";

const configured = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
const db = configured ? supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;

const $ = (sel) => document.querySelector(sel);
const signIn = $("#sign-in");
const form = $("#entry-form");
const entriesPanel = $("#entries");
const entriesList = $(".admin-entries");
const status = form.querySelector(".admin-status");
const preview = form.querySelector(".admin-preview");
const count = form.querySelector(".admin-count");

// today's date (local time) as the default
const today = new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 10);
form.elements.date.value = today;

// ---------- photo: shrink before saving (big phone photos upload slowly) ----------

const shrink = async (file, maxEdge, quality) => {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d").drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  return new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", quality));
};

const blobToDataUrl = (blob) =>
  new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.readAsDataURL(blob);
  });

form.elements.photo.addEventListener("change", () => {
  const file = form.elements.photo.files[0];
  preview.hidden = !file;
  if (file) preview.src = URL.createObjectURL(file);
});

form.elements.journal.addEventListener("input", () => {
  count.textContent = `${form.elements.journal.value.length} / ${MAX_JOURNAL}`;
});

// ---------- storage: Supabase, or this browser ----------

const local = {
  get() {
    try {
      return JSON.parse(localStorage.getItem(LOCAL_KEY)) || [];
    } catch {
      return [];
    }
  },
  set(entries) {
    localStorage.setItem(LOCAL_KEY, JSON.stringify(entries)); // throws when full
  },
};

const store = configured
  ? {
      async list() {
        const { data, error } = await db
          .from("blog_posts")
          .select("id,title,date,photo_url")
          .order("date", { ascending: false });
        if (error) throw error;
        return data;
      },
      async add({ title, date, journal, photo }) {
        const blob = await shrink(photo, 1600, 0.85);
        const path = `${crypto.randomUUID()}.jpg`;
        const upload = await db.storage.from(BUCKET).upload(path, blob, { contentType: "image/jpeg" });
        if (upload.error) throw upload.error;
        const photo_url = db.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
        const { error } = await db.from("blog_posts").insert({ title, date, journal, photo_url });
        if (error) {
          await db.storage.from(BUCKET).remove([path]); // don't leave the photo behind
          throw error;
        }
      },
      async remove(entry) {
        const { error } = await db.from("blog_posts").delete().eq("id", entry.id);
        if (error) throw error;
        const path = entry.photo_url.split(`/${BUCKET}/`)[1];
        if (path) await db.storage.from(BUCKET).remove([path]);
      },
    }
  : {
      async list() {
        return local.get().sort((a, b) => b.date.localeCompare(a.date));
      },
      async add({ title, date, journal, photo }) {
        // smaller than the Supabase version: browser storage only holds ~5MB
        const photo_url = await blobToDataUrl(await shrink(photo, 1000, 0.8));
        local.set([...local.get(), { id: Date.now(), title, date, journal, photo_url }]);
      },
      async remove(entry) {
        local.set(local.get().filter((e) => e.id !== entry.id));
      },
    };

// ---------- the list of entries, with delete ----------

const showEntries = async () => {
  const entries = await store.list();
  entriesPanel.hidden = !entries.length;
  entriesList.replaceChildren(
    ...entries.map((entry) => {
      const li = document.createElement("li");
      const label = document.createElement("span");
      label.textContent = `${entry.date} · ${entry.title}`;
      const del = document.createElement("button");
      del.type = "button";
      del.className = "admin-delete";
      del.textContent = "delete";
      del.addEventListener("click", async () => {
        if (!confirm(`Delete "${entry.title}"? This can't be undone.`)) return;
        del.disabled = true;
        try {
          await store.remove(entry);
          showEntries();
        } catch {
          del.disabled = false;
          alert("Couldn't delete that. Please try again.");
        }
      });
      li.append(label, del);
      return li;
    }),
  );
};

// ---------- adding an entry ----------

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const title = form.elements.title.value.trim();
  const journal = form.elements.journal.value.trim();
  const photo = form.elements.photo.files[0];
  if (!title || !journal || !photo || !form.elements.date.value) {
    status.textContent = "Please fill in every field.";
    return;
  }
  const button = form.querySelector(".admin-submit");
  button.disabled = true;
  status.textContent = "Saving…";
  try {
    await store.add({ title, date: form.elements.date.value, journal: journal.slice(0, MAX_JOURNAL), photo });
  } catch (err) {
    button.disabled = false;
    status.textContent =
      err && err.name === "QuotaExceededError"
        ? "This browser is out of space. Set up Supabase to keep adding entries."
        : `Couldn't save that (${(err && err.message) || "unknown error"}). If it's a phone photo, try a JPEG or PNG.`;
    return;
  }
  button.disabled = false;
  form.reset();
  form.elements.date.value = today;
  preview.hidden = true;
  count.textContent = `0 / ${MAX_JOURNAL}`;
  status.replaceChildren("Added! ");
  const view = document.createElement("a");
  view.href = "blog.html";
  view.textContent = "See it on the blog →";
  status.append(view);
  showEntries();
});

// ---------- signing in (Supabase only) ----------

const showForm = (who) => {
  signIn.hidden = true;
  form.hidden = false;
  $("#who").replaceChildren(who ? `Signed in as ${who} · ` : "");
  if (who) {
    const out = document.createElement("button");
    out.type = "button";
    out.className = "admin-link";
    out.textContent = "sign out";
    out.addEventListener("click", async () => {
      await db.auth.signOut();
      location.reload();
    });
    $("#who").append(out);
  }
  showEntries().catch(() => {});
};

if (!configured) {
  $("#local-note").hidden = false;
  showForm(null);
} else {
  signIn.elements.email.value = BLOG_OWNER_EMAIL;
  signIn.addEventListener("submit", async (e) => {
    e.preventDefault();
    const msg = signIn.querySelector(".admin-status");
    msg.textContent = "Sending…";
    const { error } = await db.auth.signInWithOtp({
      email: signIn.elements.email.value.trim(),
      // only the account you created in Supabase can sign in
      options: { shouldCreateUser: false, emailRedirectTo: location.href.split("#")[0] },
    });
    if (!error) {
      msg.textContent = "Check your email for the sign-in link.";
    } else if (/signup|not allowed|not found/i.test(error.message)) {
      // sign-ups are off, so only an existing Supabase user can get a link
      const typed = signIn.elements.email.value.trim().toLowerCase();
      msg.textContent =
        typed === BLOG_OWNER_EMAIL.toLowerCase()
          ? `${typed} isn't a user in Supabase yet. Add it under Authentication → Users → Add user, then try again.`
          : `That email can't post. Use ${BLOG_OWNER_EMAIL}.`;
    } else if (/rate limit/i.test(error.message)) {
      msg.textContent = "Too many sign-in emails for now. Wait an hour and try again.";
    } else {
      msg.textContent = `Couldn't send a link (${error.message}).`;
    }
  });

  // the sign-in link brings you back here already signed in
  db.auth.getSession().then(({ data }) => {
    const email = data.session && data.session.user.email;
    if (email) showForm(email);
    else signIn.hidden = false;
  });
  db.auth.onAuthStateChange((_event, session) => {
    if (session && form.hidden) showForm(session.user.email);
  });
}
