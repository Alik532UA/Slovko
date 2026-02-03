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
    getCountFromServer,
    writeBatch,
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
     * Підписатися на користувача (Атомарно)
     * @param targetUid - UID користувача, на якого підписуємось
     */
    async follow(targetUid: string): Promise<boolean> {
        if (!auth.currentUser) return false;
        const currentUid = auth.currentUser.uid;
        if (currentUid === targetUid) return false;

        try {
            const targetProfile = await this.getUserProfile(targetUid);
            if (!targetProfile) return false;

            const batch = writeBatch(db);

            // Додаємо в "following" поточного користувача
            const followingRef = doc(db, COLLECTIONS.USERS, currentUid, COLLECTIONS.FOLLOWING, targetUid);
            batch.set(followingRef, {
                uid: targetUid,
                displayName: targetProfile.displayName,
                photoURL: targetProfile.photoURL,
                followedAt: serverTimestamp()
            });

            // Додаємо в "followers" цільового користувача
            const followerRef = doc(db, COLLECTIONS.USERS, targetUid, COLLECTIONS.FOLLOWERS, currentUid);
            batch.set(followerRef, {
                uid: currentUid,
                displayName: auth.currentUser.displayName || 'User',
                photoURL: auth.currentUser.photoURL,
                followedAt: serverTimestamp()
            });

            await batch.commit();
            logService.log('sync', `Followed user: ${targetUid}`);
            return true;
        } catch (error) {
            logService.error('sync', 'Error following user:', error);
            return false;
        }
    },

    /**
     * Відписатися від користувача (Атомарно)
     * @param targetUid - UID користувача, від якого відписуємось
     */
    async unfollow(targetUid: string): Promise<boolean> {
        if (!auth.currentUser) return false;
        const currentUid = auth.currentUser.uid;

        try {
            const batch = writeBatch(db);

            const followingRef = doc(db, COLLECTIONS.USERS, currentUid, COLLECTIONS.FOLLOWING, targetUid);
            batch.delete(followingRef);

            const followerRef = doc(db, COLLECTIONS.USERS, targetUid, COLLECTIONS.FOLLOWERS, currentUid);
            batch.delete(followerRef);

            await batch.commit();
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
     * Пошук користувачів за ім'ям або email (Без врахування регістру)
     */
    async searchUsers(searchQuery: string, maxResults = 10): Promise<UserProfile[]> {
        if (!searchQuery || searchQuery.length < 2) return [];

        try {
            const queryLower = searchQuery.toLowerCase().trim();
            const profilesRef = collection(db, COLLECTIONS.PROFILES);
            
            // 1. Спочатку спробуємо знайти точний збіг по email
            const emailQuery = query(
                profilesRef,
                where('searchableEmail', '==', queryLower),
                limit(maxResults)
            );
            
            const emailSnapshot = await getDocs(emailQuery);
            if (!emailSnapshot.empty) {
                return emailSnapshot.docs.map(doc => ({ ...doc.data(), uid: doc.id } as UserProfile));
            }

            // 2. Якщо не знайдено, шукаємо за displayNameLower (префіксний пошук)
            const nameQuery = query(
                profilesRef,
                where('displayNameLower', '>=', queryLower),
                where('displayNameLower', '<=', queryLower + '\uf8ff'),
                limit(maxResults)
            );

            const nameSnapshot = await getDocs(nameQuery);
            const currentUid = auth.currentUser?.uid;
            
            return nameSnapshot.docs
                .map(doc => ({ ...doc.data(), uid: doc.id } as UserProfile))
                .filter(profile => profile.uid !== currentUid);
        } catch (error) {
            logService.error('sync', 'Error searching users:', error);
            return [];
        }
    },

    /**
     * Отримати публічний профіль користувача
     */
    async getUserProfile(uid: string): Promise<UserProfile | null> {
        try {
            const profileRef = doc(db, COLLECTIONS.PROFILES, uid);
            const snapshot = await getDoc(profileRef);

            if (snapshot.exists()) {
                return { ...snapshot.data(), uid } as UserProfile;
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
            
            // Визначаємо найкраще ім'я для відображення
            const displayName = auth.currentUser.displayName || 
                              auth.currentUser.email?.split('@')[0] || 
                              (auth.currentUser.isAnonymous ? 'Гість' : 'User');
            
            await setDoc(profileRef, {
                displayName: displayName,
                displayNameLower: displayName.toLowerCase(),
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
     * Отримати кількість підписників та підписок (Оптимізовано)
     */
    async getCounts(uid?: string): Promise<{ following: number; followers: number }> {
        const targetUid = uid || auth.currentUser?.uid;
        if (!targetUid) return { following: 0, followers: 0 };

        try {
            const followingRef = collection(db, COLLECTIONS.USERS, targetUid, COLLECTIONS.FOLLOWING);
            const followersRef = collection(db, COLLECTIONS.USERS, targetUid, COLLECTIONS.FOLLOWERS);

            const [followingSnap, followersSnap] = await Promise.all([
                getCountFromServer(followingRef),
                getCountFromServer(followersRef)
            ]);

            return {
                following: followingSnap.data().count,
                followers: followersSnap.data().count
            };
        } catch (error) {
            logService.error('sync', 'Error getting counts:', error);
            return { following: 0, followers: 0 };
        }
    },

    /**
     * Отримати глобальний лідерборд
     * @param metric - Метрика (totalCorrect, bestStreak, bestCorrectStreak, accuracy)
     * @param cefrLevel - Рівень (optional)
     * @param limitCount - Кількість результатів
     */
    async getLeaderboard(
        metric: 'totalCorrect' | 'bestStreak' | 'bestCorrectStreak' | 'accuracy' = 'totalCorrect',
        cefrLevel: string = 'all',
        limitCount: number = 20
    ): Promise<any[]> {
        try {
            const profilesRef = collection(db, COLLECTIONS.PROFILES);
            let q;

            // Для точності беремо більше записів, щоб відфільтрувати "читерів" (1 правильна відповідь = 100%)
            const fetchLimit = metric === 'accuracy' ? 50 : limitCount;

            // Firestore потребує окремі індекси для вкладених полів.
            // Для простоти зараз беремо загальний топ по метриках, що є в корені профілю.
            q = query(
                profilesRef,
                orderBy(metric, 'desc'),
                limit(fetchLimit)
            );

            const snapshot = await getDocs(q);
            let results = snapshot.docs.map((doc) => ({
                uid: doc.id,
                name: doc.data().displayName || 'User',
                score: doc.data()[metric] || 0,
                photoURL: doc.data().photoURL,
                isMe: doc.id === auth.currentUser?.uid,
                // Додаткові поля
                totalAttempts: doc.data().totalAttempts || 0,
                bestCorrectStreakLevel: doc.data().bestCorrectStreakLevel
            }));

            // Фільтрація для точності: прибираємо тих, хто має 100% але менше 100 спроб
            if (metric === 'accuracy') {
                results = results.filter(u => {
                    if (u.score === 100 && u.totalAttempts < 100) return false;
                    return true;
                });
            }

            // Обрізаємо до запитаної кількості і додаємо ранг
            return results.slice(0, limitCount).map((u, index) => ({
                ...u,
                rank: index + 1
            }));
        } catch (error) {
            logService.error('sync', 'Error getting leaderboard:', error);
            return [];
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
