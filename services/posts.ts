import {
    collection,
    query,
    getDocs,
    orderBy,
    where,
    getDoc,
    doc,
    addDoc,
    updateDoc,
    deleteDoc,
    serverTimestamp,
    Timestamp,
    limit,
    startAfter,
    increment
} from 'firebase/firestore';
import { db } from '../config/firebase';

export interface Post {
    id: string;
    title: string;
    content: string;
    authorId: string;
    authorName: string;
    createdAt: Date;
    updatedAt: Date;
    likes: number;
    comments: number;
    tags: string[];
    imageUrl?: string;
    status: 'draft' | 'published';
}

export interface CreatePostInput {
    title: string;
    content: string;
    authorId: string;
    authorName: string;
    tags?: string[];
    imageUrl?: string;
    status?: 'draft' | 'published';
}

export interface UpdatePostInput {
    title?: string;
    content?: string;
    tags?: string[];
    imageUrl?: string;
    status?: 'draft' | 'published';
}

export interface CreateMessageInput {
    authorUID: string;
    createdAt: Date;
    id: number;
    text: string;
    threadId: string;
}

// Create a new post
export async function createPost(input: CreatePostInput): Promise<Post> {
    try {
        const postData = {
            ...input,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
            likes: 0,
            comments: 0,
            status: input.status || 'draft',
            tags: input.tags || []
        };

        const docRef = await addDoc(collection(db, 'posts'), postData);
        const docSnap = await getDoc(docRef);

        if (!docSnap.exists()) {
            throw new Error('Failed to create post');
        }

        const data = docSnap.data();
        return {
            id: docSnap.id,
            ...data,
            createdAt: (data.createdAt as Timestamp).toDate(),
            updatedAt: (data.updatedAt as Timestamp).toDate()
        } as Post;
    } catch (error) {
        console.error('Error creating post:', error);
        throw error;
    }
}

// Get a single post by ID
export async function getPost(postId: string): Promise<Post | null> {
    try {
        const docRef = doc(db, 'posts', postId);
        const docSnap = await getDoc(docRef);

        if (!docSnap.exists()) {
            return null;
        }

        const data = docSnap.data();
        return {
            id: docSnap.id,
            ...data,
            createdAt: (data.createdAt as Timestamp).toDate(),
            updatedAt: (data.updatedAt as Timestamp).toDate()
        } as Post;
    } catch (error) {
        console.error('Error getting post:', error);
        throw error;
    }
}

// Get posts with pagination
export async function getPosts(
    pageSize: number = 10,
    lastDoc?: any
): Promise<{ posts: Post[]; lastDoc: any }> {
    try {
        let q = query(
            collection(db, 'posts'),
            where('status', '==', 'published'),
            orderBy('createdAt', 'desc'),
            limit(pageSize)
        );

        if (lastDoc) {
            q = query(
                collection(db, 'posts'),
                where('status', '==', 'published'),
                orderBy('createdAt', 'desc'),
                startAfter(lastDoc),
                limit(pageSize)
            );
        }

        const querySnapshot = await getDocs(q);
        const posts = querySnapshot.docs.map(doc => {
            const data = doc.data();
            return {
                id: doc.id,
                ...data,
                createdAt: (data.createdAt as Timestamp).toDate(),
                updatedAt: (data.updatedAt as Timestamp).toDate()
            } as Post;
        });

        const lastVisible = querySnapshot.docs[querySnapshot.docs.length - 1];

        return {
            posts,
            lastDoc: lastVisible
        };
    } catch (error) {
        console.error('Error getting posts:', error);
        throw error;
    }
}

// Get posts by author
export async function getPostsByAuthor(
    authorId: string,
    pageSize: number = 10,
    lastDoc?: any
): Promise<{ posts: Post[]; lastDoc: any }> {
    try {
        let q = query(
            collection(db, 'posts'),
            where('authorId', '==', authorId),
            orderBy('createdAt', 'desc'),
            limit(pageSize)
        );

        if (lastDoc) {
            q = query(
                collection(db, 'posts'),
                where('authorId', '==', authorId),
                orderBy('createdAt', 'desc'),
                startAfter(lastDoc),
                limit(pageSize)
            );
        }

        const querySnapshot = await getDocs(q);
        const posts = querySnapshot.docs.map(doc => {
            const data = doc.data();
            return {
                id: doc.id,
                ...data,
                createdAt: (data.createdAt as Timestamp).toDate(),
                updatedAt: (data.updatedAt as Timestamp).toDate()
            } as Post;
        });

        const lastVisible = querySnapshot.docs[querySnapshot.docs.length - 1];

        return {
            posts,
            lastDoc: lastVisible
        };
    } catch (error) {
        console.error('Error getting posts by author:', error);
        throw error;
    }
}

// Update a post
export async function updatePost(postId: string, input: UpdatePostInput): Promise<Post> {
    try {
        const docRef = doc(db, 'posts', postId);
        const updateData = {
            ...input,
            updatedAt: serverTimestamp()
        };

        await updateDoc(docRef, updateData);
        const updatedDoc = await getDoc(docRef);

        if (!updatedDoc.exists()) {
            throw new Error('Post not found');
        }

        const data = updatedDoc.data();
        return {
            id: updatedDoc.id,
            ...data,
            createdAt: (data.createdAt as Timestamp).toDate(),
            updatedAt: (data.updatedAt as Timestamp).toDate()
        } as Post;
    } catch (error) {
        console.error('Error updating post:', error);
        throw error;
    }
}

// Delete a post
export async function deletePost(postId: string): Promise<void> {
    try {
        const docRef = doc(db, 'posts', postId);
        await deleteDoc(docRef);
    } catch (error) {
        console.error('Error deleting post:', error);
        throw error;
    }
}

// Like a post
export async function likePost(postId: string): Promise<void> {
    try {
        const docRef = doc(db, 'posts', postId);
        await updateDoc(docRef, {
            likes: increment(1)
        });
    } catch (error) {
        console.error('Error liking post:', error);
        throw error;
    }
}

// Unlike a post
export async function unlikePost(postId: string): Promise<void> {
    try {
        const docRef = doc(db, 'posts', postId);
        await updateDoc(docRef, {
            likes: increment(-1)
        });
    } catch (error) {
        console.error('Error unliking post:', error);
        throw error;
    }
}

// Create a new message
export async function createMessage(input: CreateMessageInput): Promise<void> {
    try {
        const messageData = {
            ...input,
            createdAt: input.createdAt
        };

        await addDoc(collection(db, 'posts'), messageData);
    } catch (error) {
        console.error('Error creating message:', error);
        throw error;
    }
} 