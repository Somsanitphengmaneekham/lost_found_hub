export function registerBootstrapRoutes(app, pool, loaders) {
  app.get("/api/bootstrap", async (_req, res, next) => {
    try {
      const [categories, locations, departments, foundPosts, lostPosts, matches, returnRecords, demoUsers, members] =
        await Promise.all([
          loaders.queryCategories(pool),
          loaders.queryLocations(pool),
          loaders.queryDepartments(pool),
          loaders.queryFoundPosts(pool),
          loaders.queryLostPosts(pool),
          loaders.queryMatches(pool),
          loaders.queryReturnRecords(pool),
          loaders.queryDemoUsers(pool),
          loaders.queryMembers ? loaders.queryMembers(pool) : loaders.queryDemoUsers(pool),
        ]);

      res.json({
        categories,
        locations,
        departments,
        foundPosts,
        lostPosts,
        matches,
        returnRecords,
        demoUsers,
        members,
      });
    } catch (error) {
      next(error);
    }
  });
}
