using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace JobTrackr.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddJobDescription : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "JobDescription",
                table: "job_applications",
                type: "text",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "prep_sessions",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    UserId = table.Column<Guid>(type: "uuid", nullable: false),
                    JobApplicationId = table.Column<Guid>(type: "uuid", nullable: true),
                    Mode = table.Column<int>(type: "integer", nullable: false),
                    Title = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    CompanyName = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: true),
                    Position = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: true),
                    JobDescriptionSnapshot = table.Column<string>(type: "text", nullable: true),
                    CompletedAt = table.Column<DateTime>(type: "timestamp without time zone", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp without time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp without time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_prep_sessions", x => x.Id);
                    table.ForeignKey(
                        name: "FK_prep_sessions_job_applications_JobApplicationId",
                        column: x => x.JobApplicationId,
                        principalTable: "job_applications",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_prep_sessions_users_UserId",
                        column: x => x.UserId,
                        principalTable: "users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "prep_questions",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    SessionId = table.Column<Guid>(type: "uuid", nullable: false),
                    Order = table.Column<int>(type: "integer", nullable: false),
                    Question = table.Column<string>(type: "text", nullable: false),
                    Category = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    Difficulty = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    WhyAsked = table.Column<string>(type: "text", nullable: false),
                    ModelAnswer = table.Column<string>(type: "text", nullable: true),
                    Mastery = table.Column<int>(type: "integer", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp without time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp without time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_prep_questions", x => x.Id);
                    table.ForeignKey(
                        name: "FK_prep_questions_prep_sessions_SessionId",
                        column: x => x.SessionId,
                        principalTable: "prep_sessions",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "prep_attempts",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    QuestionId = table.Column<Guid>(type: "uuid", nullable: false),
                    AnswerText = table.Column<string>(type: "text", nullable: false),
                    Score = table.Column<int>(type: "integer", nullable: true),
                    StrengthsJson = table.Column<string>(type: "text", nullable: true),
                    ImprovementsJson = table.Column<string>(type: "text", nullable: true),
                    ModelAnswer = table.Column<string>(type: "text", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp without time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp without time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_prep_attempts", x => x.Id);
                    table.ForeignKey(
                        name: "FK_prep_attempts_prep_questions_QuestionId",
                        column: x => x.QuestionId,
                        principalTable: "prep_questions",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_prep_attempts_QuestionId_CreatedAt",
                table: "prep_attempts",
                columns: new[] { "QuestionId", "CreatedAt" });

            migrationBuilder.CreateIndex(
                name: "IX_prep_questions_SessionId_Order",
                table: "prep_questions",
                columns: new[] { "SessionId", "Order" });

            migrationBuilder.CreateIndex(
                name: "IX_prep_sessions_JobApplicationId",
                table: "prep_sessions",
                column: "JobApplicationId");

            migrationBuilder.CreateIndex(
                name: "IX_prep_sessions_UserId_CreatedAt",
                table: "prep_sessions",
                columns: new[] { "UserId", "CreatedAt" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "prep_attempts");

            migrationBuilder.DropTable(
                name: "prep_questions");

            migrationBuilder.DropTable(
                name: "prep_sessions");

            migrationBuilder.DropColumn(
                name: "JobDescription",
                table: "job_applications");
        }
    }
}
