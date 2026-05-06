FROM mcr.microsoft.com/dotnet/sdk:9.0 AS build
WORKDIR /src

COPY ["src/JobTrackr.Domain/JobTrackr.Domain.csproj", "src/JobTrackr.Domain/"]
COPY ["src/JobTrackr.Application/JobTrackr.Application.csproj", "src/JobTrackr.Application/"]
COPY ["src/JobTrackr.Infrastructure/JobTrackr.Infrastructure.csproj", "src/JobTrackr.Infrastructure/"]
COPY ["src/JobTrackr.Api/JobTrackr.Api.csproj", "src/JobTrackr.Api/"]
RUN dotnet restore "src/JobTrackr.Api/JobTrackr.Api.csproj"

COPY . .
WORKDIR /src/src/JobTrackr.Api
RUN dotnet publish "JobTrackr.Api.csproj" -c Release -o /app/publish /p:UseAppHost=false

FROM mcr.microsoft.com/dotnet/aspnet:9.0 AS final
WORKDIR /app
COPY --from=build /app/publish .

ENV ASPNETCORE_URLS=http://+:8080
EXPOSE 8080

ENTRYPOINT ["dotnet", "JobTrackr.Api.dll"]
