/** How many videos one reader may boost at once: a push spent on everyone's feed stays scarce.
 *  Its own module so the feed (client) and src/lib/boost.ts (server) read one number. */
export const BOOST_CAP = 10
