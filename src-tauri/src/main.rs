#![cfg_attr(
    all(not(debug_assertions), target_os = "windows"),
    windows_subsystem = "windows"
)]

use std::io::{Read, Seek, SeekFrom, Write};

use tauri::http::{
    header::{
        ACCEPT_RANGES, ACCESS_CONTROL_ALLOW_ORIGIN, CONTENT_LENGTH, CONTENT_RANGE, CONTENT_TYPE,
        RANGE,
    },
    status::StatusCode,
    MimeType, ResponseBuilder,
};

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![])
        .register_uri_scheme_protocol("stream", move |_app, request| {
            use url::{Position, Url};

            let parsed_path = Url::parse(request.uri())?;
            let filtered_path = &parsed_path[..Position::AfterPath];
            let path = filtered_path
                .strip_prefix("stream://localhost/")
                // the `strip_prefix` only returns None when a request is made to `https://tauri.$P` on Windows
                // where `$P` is not `localhost/*`
                .unwrap_or("");
            let path = percent_encoding::percent_decode(path.as_bytes())
                .decode_utf8_lossy()
                .to_string();

            let mut file = std::fs::File::open(&path)?;

            // get current position
            let old_pos = file.seek(SeekFrom::Current(0))?;
            // get file len
            let len = file.seek(SeekFrom::End(0))?;
            // reset position
            file.seek(SeekFrom::Start(old_pos))?;

            // get the mime type
            let mut prelude: [u8; 256] = [0; 256];
            file.read(&mut prelude)?;
            let mime_type = MimeType::parse(&prelude, &path);

            // reset position
            file.seek(SeekFrom::Start(0))?;

            let mut resp = ResponseBuilder::new().header(CONTENT_TYPE, &mime_type);
            resp = resp.header(ACCESS_CONTROL_ALLOW_ORIGIN, "*"); // INFO: added to support: crossorigin="anonymous", on video element

            let response = if let Some(x) = request.headers().get(RANGE) {
                let not_satisfiable = || {
                    ResponseBuilder::new()
                        .status(StatusCode::RANGE_NOT_SATISFIABLE)
                        .header(CONTENT_RANGE, format!("bytes */{len}"))
                        .body(vec![])
                };

                resp = resp.header(ACCEPT_RANGES, "bytes");

                let ranges = http_range_header::parse_range_header(x.to_str()?)?;
                let ranges = ranges.validate(len);
                let ranges: Vec<_> = if let Ok(x) = ranges {
                    x.iter().map(|r| (*r.start(), *r.end())).collect()
                } else {
                    return not_satisfiable();
                };

                const MAX_LEN: u64 = 1000 * 1024;

                if ranges.len() == 1 {
                    let &(start, mut end) = ranges.first().unwrap();

                    if start >= len || end >= len || end < start {
                        return not_satisfiable();
                    }

                    end = start + (end - start).min(len - start).min(MAX_LEN - 1);

                    file.seek(SeekFrom::Start(start))?;

                    let mut stream: Box<dyn Read> = Box::new(file);
                    if end + 1 < len {
                        stream = Box::new(stream.take(end + 1 - start));
                    }

                    let mut buf = Vec::new();
                    stream.read_to_end(&mut buf)?;

                    resp = resp.header(CONTENT_RANGE, format!("bytes {start}-{end}/{len}"));
                    resp = resp.header(CONTENT_LENGTH, end + 1 - start);
                    resp = resp.status(StatusCode::PARTIAL_CONTENT);
                    resp.body(buf)
                } else {
                    let mut buf = Vec::new();
                    let ranges = ranges
                        .iter()
                        .filter_map(|&(start, mut end)| {
                            if start >= len || end >= len || end < start {
                                None
                            } else {
                                end = start + (end - start).min(len - start).min(MAX_LEN - 1);
                                Some((start, end))
                            }
                        })
                        .collect::<Vec<_>>();

                    let boundary = random_boundary();
                    let boundary_sep = format!("\r\n--{boundary}\r\n");
                    let boundary_closer = format!("\r\n--{boundary}\r\n");

                    resp = resp.header(
                        CONTENT_TYPE,
                        format!("multipart/byteranges; boundary={boundary}"),
                    );

                    drop(file);

                    for (end, start) in ranges {
                        buf.write_all(boundary_sep.as_bytes())?;
                        buf.write_all(format!("{CONTENT_TYPE}: {mime_type}\r\n").as_bytes())?;
                        buf.write_all(
                            format!("{CONTENT_RANGE}: bytes {start}-{end}/{len}\r\n").as_bytes(),
                        )?;
                        buf.write_all("\r\n".as_bytes())?;

                        let mut file = std::fs::File::open(&path)?;
                        file.seek(SeekFrom::Start(start))?;
                        file.take(if end + 1 < len { end + 1 - start } else { len })
                            .read_to_end(&mut buf)?;
                    }
                    buf.write_all(boundary_closer.as_bytes())?;

                    resp.body(buf)
                }
            } else {
                resp = resp.header(CONTENT_LENGTH, len);
                let mut buf = vec![0; len as usize];
                file.read_to_end(&mut buf)?;
                resp.body(buf)
            };

            response
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

fn random_boundary() -> String {
    use rand::RngCore;

    let mut x = [0 as u8; 30];
    rand::thread_rng().fill_bytes(&mut x);
    (&x[..])
        .iter()
        .map(|&x| format!("{:x}", x))
        .fold(String::new(), |mut a, x| {
            a.push_str(x.as_str());
            a
        })
}
