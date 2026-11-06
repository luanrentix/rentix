'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {databaseConnectionOptions}=require('../lib/database-connection.cjs');
test('remote Supabase requires trusted CA and hostname validation despite legacy false flag',()=>{
  const config=databaseConnectionOptions('postgresql://fixture:fixture@aws-0-fixture.pooler.supabase.com:5432/postgres?sslmode=require',{CONTRX_DB_SSL_REJECT_UNAUTHORIZED:'false'});
  assert.equal(config.ssl.rejectUnauthorized,true);
  assert.match(config.ssl.ca,/BEGIN CERTIFICATE/);
  assert.equal(new URL(config.connectionString).searchParams.has('sslmode'),false);
  assert.equal(config.ssl.checkServerIdentity,undefined);
});
test('other remote PostgreSQL uses system trust and refuses insecure URL sslmode',()=>{
  const config=databaseConnectionOptions('postgresql://fixture:fixture@database.example.invalid/db?sslmode=no-verify');
  assert.equal(config.ssl.rejectUnauthorized,true);assert.equal(config.ssl.ca,undefined);
});
test('localhost remains usable for isolated development',()=>{
  const config=databaseConnectionOptions('postgresql://fixture:fixture@127.0.0.1/db');
  assert.equal(config.ssl,undefined);
});
