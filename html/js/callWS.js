callWS = {
    endpoint: function(method, url, data, dataType="json", contentType = "application/json; charset=utf-8", successCallback, errorCallback) {
        $.ajax({
            type: method,
            async: false,
            url: "/webdorecap/" + url + ".cgi",
            data: data,
            cache: false,
            dataType: dataType,
            contentType: contentType,
            timeout: 10000,
            success: function (response) {
                if (typeof successCallback === 'function') {
                    successCallback(response);
                }
            },
            error: function (textStatus, errorThrown) {
                if (typeof errorCallback === 'function') {
                    errorCallback(errorThrown);
                }
            }
        });

    }
};