/**
 * FriendsService - Сервіс для управління підписками та друзями
 * 
 * Структура Firestore:
 * /users/{uid}/following/{targetUid} - на кого підписаний користувач
 * /users/{uid}/followers/{followerUid} - хто підписаний на користувача
 * /users/{uid}/profile - публічний профіль (displayName, photoURL, searchableEmail)
 */

import {
    collection,
    doc,
    setDoc,
    deleteDoc,
    getDocs,
    getDoc,
    query,
    where,
    orderBy,
    limit,
    serverTimestamp,
    type Timestamp
} from "firebase/firestore";
import { db, auth } from "./config";
import { logService } from "../services/logService";
import type { UserPrivacySettings } from "../types";

/** Інтерфейс публічного профілю */
export interface UserProfile {
    uid: string;
    displayName: string;
    photoURL: string | null;
    searchableEmail?: string; // Для пошуку (опціонально)
    privacy?: UserPrivacySettings;
}

/** Інтерфейс підписки */
export interface FollowRecord {
    uid: string;
    displayName: string;
    photoURL: string | null;
    followedAt: Timestamp | null;
}

/** Колекції Firestore */
const COLLECTIONS = {
    USERS: "users",
    FOLLOWING: "following",
    FOLLOWERS: "followers",
    PROFILES: "profiles"
};

/**
 * Сервіс для керування друзями та підписками
 */
export const FriendsService = {
    /**
     * Підписатися на користувача
     * @param targetUid - UID користувача, на якого підписуємось
     */
    async follow(targetUid: string): Promise<boolean> {
        if (!auth.currentUser) {
            logService.warn('sync', 'Cannot follow: not authenticated');
            return false;
        }

        const currentUid = auth.currentUser.uid;

        if (currentUid === targetUid) {
            logService.warn('sync', 'Cannot follow yourself');
            return false;
        }

        try {
            // Отримуємо профіль цільового користувача
            const targetProfile = await this.getUserProfile(targetUid);
            if (!targetProfile) {
                logService.warn('sync', 'Target user profile not found');
                return false;
            }

            // Додаємо в "following" поточного користувача
            const followingRef = doc(db, COLLECTIONS.USERS, currentUid, COLLECTIONS.FOLLOWING, targetUid);
            await setDoc(followingRef, {
                uid: targetUid,
                displayName: targetProfile.displayName,
                photoURL: targetProfile.photoURL,
                followedAt: serverTimestamp()
            });

            // Додаємо в "followers" цільового користувача
            const followerRef = doc(db, COLLECTIONS.USERS, targetUid, COLLECTIONS.FOLLOWERS, currentUid);
            await setDoc(followerRef, {
                uid: currentUid,
                displayName: auth.currentUser.displayName || 'User',
                photoURL: auth.currentUser.photoURL,
                followedAt: serverTimestamp()
            });

            logService.log('sync', `Followed user: ${targetUid}`);
            return true;
        } catch (error) {
            logService.error('sync', 'Error following user:', error);
            return false;
        }
    },

    /**
     * Відписатися від користувача
     * @param targetUid - UID користувача, від якого відписуємось
     */
    async unfollow(targetUid: string): Promise<boolean> {
        if (!auth.currentUser) {
            logService.warn('sync', 'Cannot unfollow: not authenticated');
            return false;
        }

        const currentUid = auth.currentUser.uid;

        try {
            // Видаляємо з "following" поточного користувача
            const followingRef = doc(db, COLLECTIONS.USERS, currentUid, COLLECTIONS.FOLLOWING, targetUid);
            await deleteDoc(followingRef);

            // Видаляємо з "followers" цільового користувача
            const followerRef = doc(db, COLLECTIONS.USERS, targetUid, COLLECTIONS.FOLLOWERS, currentUid);
            await deleteDoc(followerRef);

            logService.log('sync', `Unfollowed user: ${targetUid}`);
            return true;
        } catch (error) {
            logService.error('sync', 'Error unfollowing user:', error);
            return false;
        }
    },

    /**
     * Отримати список підписок (на кого підписаний)
     * @param uid - UID користувача (за замовчуванням - поточний)
     */
    async getFollowing(uid?: string): Promise<FollowRecord[]> {
        const targetUid = uid || auth.currentUser?.uid;
        if (!targetUid) return [];

        try {
            const followingRef = collection(db, COLLECTIONS.USERS, targetUid, COLLECTIONS.FOLLOWING);
            const snapshot = await getDocs(followingRef);

            return snapshot.docs.map(doc => doc.data() as FollowRecord);
        } catch (error) {
            logService.error('sync', 'Error getting following:', error);
            return [];
        }
    },

    /**
     * Отримати список підписників (хто підписаний на мене)
     * @param uid - UID користувача (за замовчуванням - поточний)
     */
    async getFollowers(uid?: string): Promise<FollowRecord[]> {
        const targetUid = uid || auth.currentUser?.uid;
        if (!targetUid) return [];

        try {
            const followersRef = collection(db, COLLECTIONS.USERS, targetUid, COLLECTIONS.FOLLOWERS);
            const snapshot = await getDocs(followersRef);

            return snapshot.docs.map(doc => doc.data() as FollowRecord);
        } catch (error) {
            logService.error('sync', 'Error getting followers:', error);
            return [];
        }
    },

    /**
     * Отримати список взаємних друзів
     */
    async getMutualFriends(): Promise<FollowRecord[]> {
        if (!auth.currentUser) return [];

        try {
            const [following, followers] = await Promise.all([
                this.getFollowing(),
                this.getFollowers()
            ]);

            const followerUids = new Set(followers.map(f => f.uid));
            return following.filter(f => followerUids.has(f.uid));
        } catch (error) {
            logService.error('sync', 'Error getting mutual friends:', error);
            return [];
        }
    },

    /**
     * Перевірити, чи підписаний на користувача
     * @param targetUid - UID користувача для перевірки
     */
    async isFollowing(targetUid: string): Promise<boolean> {
        if (!auth.currentUser) return false;

        try {
            const followingRef = doc(db, COLLECTIONS.USERS, auth.currentUser.uid, COLLECTIONS.FOLLOWING, targetUid);
            const snapshot = await getDoc(followingRef);
            return snapshot.exists();
        } catch (error) {
            logService.error('sync', 'Error checking follow status:', error);
            return false;
        }
    },

    /**
     * Пошук користувачів за email або ім'ям
     * @param searchQuery - Пошуковий запит
     * @param maxResults - Максимальна кількість результатів
     */
    async searchUsers(searchQuery: string, maxResults = 10): Promise<UserProfile[]> {
        if (!searchQuery || searchQuery.length < 2) return [];

        try {
            const normalizedQuery = searchQuery.toLowerCase().trim();

            // Пошук за searchableEmail (якщо є)
            const profilesRef = collection(db, COLLECTIONS.PROFILES);
            const q = query(
                profilesRef,
                where('searchableEmail', '>=', normalizedQuery),
                where('searchableEmail', '<=', normalizedQuery + '\uf8ff'),
                limit(maxResults)
            );

            const snapshot = await getDocs(q);

            // Фільтруємо себе
            const currentUid = auth.currentUser?.uid;
            return snapshot.docs
                .map(doc => ({ ...doc.data(), uid: doc.id } as UserProfile))
                .filter(profile => profile.uid !== currentUid);
        } catch (error) {
            logService.error('sync', 'Error searching users:', error);
            return [];
        }
    },

    /**
     * Отримати публічний профіль користувача
     * @param uid - UID користувача
     */
    async getUserProfile(uid: string): Promise<UserProfile | null> {
        try {
            const profileRef = doc(db, COLLECTIONS.PROFILES, uid);
            const snapshot = await getDoc(profileRef);

            if (snapshot.exists()) {
                return { ...snapshot.data(), uid } as UserProfile;
            }

            // Fallback: спробувати отримати з основного документа users
            const userRef = doc(db, COLLECTIONS.USERS, uid);
            const userSnapshot = await getDoc(userRef);

            if (userSnapshot.exists()) {
                const data = userSnapshot.data();
                return {
                    uid,
                    displayName: data.displayName || 'User',
                    photoURL: data.avatar ? `internal:${data.avatar.icon}:${data.avatar.color}` : null
                };
            }

            return null;
        } catch (error) {
            logService.error('sync', 'Error getting user profile:', error);
            return null;
        }
    },

    /**
     * Оновити свій публічний профіль для пошуку
     */
    async updatePublicProfile(): Promise<void> {
        if (!auth.currentUser) return;

        try {
            const profileRef = doc(db, COLLECTIONS.PROFILES, auth.currentUser.uid);
            await setDoc(profileRef, {
                displayName: auth.currentUser.displayName || 'User',
                photoURL: auth.currentUser.photoURL,
                searchableEmail: auth.currentUser.email?.toLowerCase() || null,
                updatedAt: serverTimestamp()
            }, { merge: true });

            logService.log('sync', 'Public profile updated');
        } catch (error) {
            logService.error('sync', 'Error updating public profile:', error);
        }
    },

    /**
     * Отримати кількість підписників та підписок
     */
    async getCounts(uid?: string): Promise<{ following: number; followers: number }> {
        const targetUid = uid || auth.currentUser?.uid;
        if (!targetUid) return { following: 0, followers: 0 };

        try {
            const [following, followers] = await Promise.all([
                this.getFollowing(targetUid),
                this.getFollowers(targetUid)
            ]);

            return {
                following: following.length,
                followers: followers.length
            };
        } catch (error) {
            logService.error('sync', 'Error getting counts:', error);
            return { following: 0, followers: 0 };
        }
    },

    /**
     * Оновити налаштування приватності
     */
    async updatePrivacySettings(settings: UserPrivacySettings): Promise<boolean> {
        if (!auth.currentUser) return false;

        try {
            const profileRef = doc(db, COLLECTIONS.PROFILES, auth.currentUser.uid);
            await setDoc(profileRef, {
                privacy: settings,
                updatedAt: serverTimestamp()
            }, { merge: true });

            logService.log('sync', 'Privacy settings updated');
            return true;
        } catch (error) {
            logService.error('sync', 'Error updating privacy settings:', error);
            return false;
        }
    }
};
