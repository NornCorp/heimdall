# TODO

## Proto Dependencies

Currently, `Resource` and `Field` proto messages are duplicated in both:
- `loki/api/meta/v1/meta.proto` (source of truth)
- `heimdall/api/observer/v1/observer.proto` (copy)

**Future improvement:** Configure Heimdall to import from Loki's protos directly.

### Option 1: Buf Schema Registry (BSR)
1. Push Loki protos to BSR: `buf push`
2. Add to `heimdall/buf.yaml`:
   ```yaml
   deps:
     - buf.build/norncorp/loki
   ```
3. Import in `observer.proto`:
   ```protobuf
   import "meta/v1/meta.proto";
   ```

### Option 2: Local Development
Use buf workspace for local development:
```yaml
# norncorp/buf.work.yaml
version: v2
directories:
  - loki
  - heimdall
```

For now, keep protos in sync manually. Changes to Resource/Field must be applied to both files.
