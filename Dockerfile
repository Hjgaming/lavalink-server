FROM ghcr.io/lavalink-devs/lavalink:4-alpine

WORKDIR /opt/Lavalink

COPY application.yml ./

EXPOSE 2333

CMD ["java", "-jar", "Lavalink.jar"]
