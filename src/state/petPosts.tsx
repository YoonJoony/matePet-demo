import { createContext, ReactNode, useCallback, useContext, useMemo, useState } from 'react';

import { defaultPetFilter, PetFilter, PetPost, PetPurpose, samplePosts } from '@/data/pets';
import type { PetDraft } from '@/components/pets/petForm';

type PetPostsValue = {
  posts: PetPost[];
  addPost: (post: PetPost) => void;
  // 작성자의 글 수정·상태 변경 (지도·목록·상세에 함께 반영)
  updatePost: (id: string, patch: Partial<PetPost>) => void;
  findPost: (id: string) => PetPost | undefined;
  likedIds: ReadonlySet<string>;
  toggleLike: (id: string) => void;
  drafts: Partial<Record<PetPurpose, PetDraft>>;
  saveDraft: (purpose: PetPurpose, draft: PetDraft) => void;
  clearDraft: (purpose: PetPurpose) => void;
  // 지도와 글 목록이 함께 쓰는 필터 (기획서 5.1 — 같은 필터 공유)
  filter: PetFilter;
  setFilter: (filter: PetFilter) => void;
};

const PetPostsContext = createContext<PetPostsValue | null>(null);

// 등록 글·찜·임시저장을 앱 메모리에 둔다 (새로고침하면 샘플 상태로 돌아감 — 기획서 7.4.1).
export function PetPostsProvider({ children }: { children: ReactNode }) {
  const [posts, setPosts] = useState<PetPost[]>(samplePosts);
  const [likedIds, setLikedIds] = useState<ReadonlySet<string>>(new Set());
  const [drafts, setDrafts] = useState<Partial<Record<PetPurpose, PetDraft>>>({});
  const [filter, setFilter] = useState<PetFilter>(defaultPetFilter);

  const addPost = useCallback((post: PetPost) => setPosts((prev) => [post, ...prev]), []);
  const updatePost = useCallback(
    (id: string, patch: Partial<PetPost>) => setPosts((prev) => prev.map((post) => (post.id === id ? { ...post, ...patch, id } : post))),
    [],
  );
  const toggleLike = useCallback((id: string) => {
    setLikedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);
  const saveDraft = useCallback((purpose: PetPurpose, draft: PetDraft) => setDrafts((prev) => ({ ...prev, [purpose]: draft })), []);
  const clearDraft = useCallback(
    (purpose: PetPurpose) =>
      setDrafts((prev) => {
        const next = { ...prev };
        delete next[purpose];
        return next;
      }),
    [],
  );

  const value = useMemo<PetPostsValue>(
    () => ({
      posts,
      addPost,
      updatePost,
      findPost: (id) => posts.find((post) => post.id === id),
      likedIds,
      toggleLike,
      drafts,
      saveDraft,
      clearDraft,
      filter,
      setFilter,
    }),
    [posts, addPost, updatePost, likedIds, toggleLike, drafts, saveDraft, clearDraft, filter],
  );

  return <PetPostsContext.Provider value={value}>{children}</PetPostsContext.Provider>;
}

export function usePetPosts(): PetPostsValue {
  const context = useContext(PetPostsContext);
  if (!context) throw new Error('usePetPosts must be used inside PetPostsProvider');
  return context;
}
