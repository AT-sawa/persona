import { getPostBySlug, getAllPosts } from "@/lib/blog";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  const posts = getAllPosts();
  return posts.map((post) => ({ slug: post.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPostBySlug(slug);
  if (!post) return {};
  return {
    title: post.title,
    description: post.description,
  };
}

export default async function BlogPostPage({ params }: Props) {
  const { slug } = await params;
  const post = await getPostBySlug(slug);

  if (!post) {
    notFound();
  }

  return (
    <>
      <Header />
      <main className="py-[72px] px-6">
        <article className="max-w-[800px] mx-auto">
          <p className="text-xs text-[#888] mb-2">{post.date}</p>
          <h1 className="text-[clamp(22px,3vw,30px)] font-black text-navy leading-[1.4] mb-6">
            {post.title}
          </h1>
          <div
            className="prose prose-sm max-w-none text-[#555] leading-[1.9]"
            dangerouslySetInnerHTML={{ __html: post.content ?? "" }}
          />
        </article>
      </main>
      <Footer />
    </>
  );
}
