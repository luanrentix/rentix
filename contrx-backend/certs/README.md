# CA pública Supabase

`supabase-root.crt` é um certificado público, sem chave privada. Origem HTTPS:
https://supabase-downloads.s3-ap-southeast-1.amazonaws.com/prod/ssl/prod-ca-2021.crt

Verificação em 06/11/2026: Supabase Root 2021 CA, validade até 26/04/2031.
SHA-256: `80:70:25:AD:50:D4:ED:21:9D:2C:9C:7D:29:9C:00:4F:82:4E:B0:0C:F7:F6:5A:FE:F6:07:D0:7B:72:E6:CA:FA`.

O helper `scripts/lib/database-connection.cjs` exige verificação da cadeia e do hostname para conexões remotas. Não honra o antigo bypass `CONTRX_DB_SSL_REJECT_UNAUTHORIZED=false`. Para uma CA específica, configurar `CONTRX_DB_SSL_CA_FILE` em ambiente controlado. Nunca adicionar a chave privada do servidor.

Conferir eventual rotação no painel oficial antes de substituir o certificado. O certificado é distribuído na imagem backend, na pasta `/app/certs`.
