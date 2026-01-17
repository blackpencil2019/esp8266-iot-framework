#ifndef SERVER_H
#define SERVER_H

#include <ESPAsyncWebServer.h>

class webServer
{

private:
    static void handleFileUpload(AsyncWebServerRequest *request, String filename, size_t index, uint8_t *data, size_t len, bool final);
    void bindAll();

public:
    AsyncWebServer server = AsyncWebServer(80);
    AsyncWebSocket ws = AsyncWebSocket("/ws");
    ArRequestHandlerFunction requestHandler = nullptr;

    static void serveProgmem(AsyncWebServerRequest *request);
    static void serveFs(AsyncWebServerRequest *request);
    void begin(ArRequestHandlerFunction rh = serveProgmem);
};

extern webServer GUI;

#endif
