using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;

namespace DirectoryService.Data;

public class DirectoryContextFactory : IDesignTimeDbContextFactory<DirectoryContext>
{
    public DirectoryContext CreateDbContext(string[] args)
    {
        var optionsBuilder = new DbContextOptionsBuilder<DirectoryContext>();
        optionsBuilder.UseSqlite("Data Source=Directory.db");

        return new DirectoryContext(optionsBuilder.Options);
    }
}
