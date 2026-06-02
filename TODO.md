# TODO LIST

## File & Folder operations

- [X] `Rename` - Rename both File and Folder
- [ ] `Delete` - Files & Folders

## User operations

- [x] `Get` user info.
- [ ] `Delete` User profile
- [ ] `Storage` Inforamation per user.
- [x] `Edit` User information.
- [x] `Update` Password.

## Agent operations

- [X] `Edit` - Edit agent scopes and name.
- [X] `Delete` - Delete an agent.
- [X] `list` - List all agents.
- [X]  Remove user creation via agent feature.

## Auth features

- [ ] `Google` support
- [ ] `Microsoft` support
- [ ] `Internal token` management

## Zod middleware still needed

- [ ] `POST /upload` - validate multipart upload metadata and `user_id`
- [ ] `POST /upload/init` - validate `filename`, `mimetype`, `size`, `pathname`, `user_id`
- [ ] `PUT /upload/:uploadId/parts/:partNumber` - validate route params before accepting raw chunk data
- [ ] `POST /upload/:uploadId/complete/:uploadfilehash` - validate `uploadId` and `uploadfilehash`
- [ ] `GET /me` - validate the authenticated user payload used by `recentFiles`
- [X] `POST /createfolder/:folderName` - validate `folderName`, `path`, and owner fields
- [X] `POST /move/folder` - validate `user_id`, `sourcePath`, and `destinationPath`
- [X] `POST /move/file/:filename` - validate `filename`, `user_id`, `sourcePath`, and `destinationPath`
- [ ] `GET /stream/:filename` - validate `filename` and path lookup input
- [ ] `GET /stream/file/:object` - validate `object` before streaming the file

## Already covered

- `POST /register`
- `POST /register/agent`
- `POST /login`


