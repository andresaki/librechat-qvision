import { atom } from 'jotai';

/** Local admin-only email/password login visibility on the public login route. */
export const adminLoginVisibleAtom = atom(false);
