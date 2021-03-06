/**
 * Copyright © 2016-present Kriasoft.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE.txt file in the root directory of this source tree.
 */

/* eslint-disable no-restricted-syntax, no-await-in-loop */

const faker = require('faker');
const fs = require('fs');
const readline = require('readline');

async function readLines({ path }) {
  const lineReader = readline.createInterface({
    input: fs.createReadStream(path),
  });

  let onClose;
  const promise = new Promise(resolve => {
    onClose = resolve;
  });

  const output = [];
  lineReader.on('line', line => {
    const [lex, word] = line.split(': ');
    output.push({ lex, word });
  });
  lineReader.on('close', () => {
    onClose(output);
  });

  return promise;
}

module.exports.seed = async db => {
  // Create 10 random website users (as an example)
  const users = Array.from({ length: 10 }).map(() => ({
    display_name: faker.name.findName(),
    image_url: faker.internet.avatar(),
  }));

  await Promise.all(
    users.map(user =>
      db
        .table('users')
        .insert(user)
        .returning('id')
        .then(rows =>
          db
            .table('users')
            .where('id', '=', rows[0])
            .first()
            .then(u =>
              db
                .table('emails')
                .insert({
                  user_id: u.id,
                  email: faker.internet.email().toLowerCase(),
                })
                .then(() => u),
            ),
        )
        .then(row => Object.assign(user, row)),
    ),
  );

  // // Create 500 stories
  // const stories = Array.from({ length: 500 }).map(() =>
  //   Object.assign(
  //     {
  //       author_id: users[faker.random.number({ min: 0, max: users.length - 1 })].id,
  //       title: faker.lorem
  //         .sentence(faker.random.number({ min: 4, max: 7 }))
  //         .slice(0, -1)
  //         .substr(0, 80),
  //     },
  //     Math.random() > 0.3 ? { text: faker.lorem.text() } : { url: faker.internet.url() },
  //     (date => ({ created_at: date, updated_at: date }))(faker.date.past()),
  //   ),
  // );
  //
  // await Promise.all(
  //   stories.map(story =>
  //     db
  //       .table('stories')
  //       .insert(story)
  //       .returning('id')
  //       .then(rows =>
  //         db
  //           .table('stories')
  //           .where('id', '=', rows[0])
  //           .first(),
  //       )
  //       .then(row => Object.assign(story, row)),
  //   ),
  // );
  //
  // // Create some user comments
  // const comments = Array.from({ length: 2000 }).map(() =>
  //   Object.assign(
  //     {
  //       story_id: stories[faker.random.number({ min: 0, max: stories.length - 1 })].id,
  //       author_id: users[faker.random.number({ min: 0, max: users.length - 1 })].id,
  //       text: faker.lorem.sentences(faker.random.number({ min: 1, max: 10 })),
  //     },
  //     (date => ({ created_at: date, updated_at: date }))(faker.date.past()),
  //   ),
  // );
  //
  // await Promise.all(
  //   comments.map(comment =>
  //     db
  //       .table('comments')
  //       .insert(comment)
  //       .returning('id')
  //       .then(rows =>
  //         db
  //           .table('comments')
  //           .where('id', '=', rows[0])
  //           .first(),
  //       )
  //       .then(row => Object.assign(comment, row)),
  //   ),
  // );

  await db.schema.dropTableIfExists('corpus_dictionaries');
  await db.schema.dropTableIfExists('dictionaries');
  await db.schema.dropTableIfExists('corpus');

  await db.schema.createTable('corpus', table => {
    table
      .uuid('id')
      .notNullable()
      .defaultTo(db.raw('uuid_generate_v1mc()'))
      .primary();
    table.string('word', 100);
    table.string('lex', 100).index();
  });

  await db.schema.createTable('dictionaries', table => {
    table
      .uuid('id')
      .notNullable()
      .defaultTo(db.raw('uuid_generate_v1mc()'))
      .primary();
    table.string('name', 100);
  });

  await db.schema.createTable('corpus_dictionaries', table => {
    table
      .uuid('corpus_id')
      .notNullable()
      .references('id')
      .inTable('corpus')
      .onDelete('CASCADE')
      .onUpdate('CASCADE');
    table
      .uuid('dictionary_id')
      .notNullable()
      .references('id')
      .inTable('dictionaries')
      .onDelete('CASCADE')
      .onUpdate('CASCADE');
    table.primary(['corpus_id', 'dictionary_id']);
  });

  const dictionaryIds = await db
    .table('dictionaries')
    .insert({ name: 'CSW15' })
    .returning('id');
  const dictionaryId = dictionaryIds[0];
  console.log(dictionaryId);
  const lexWordArray = await readLines({ path: './seeds/csw15.list' });
  console.log(lexWordArray);
  // bind message supplies 2560 parameters; 1 param needed per column
  const batchSize = 1280;
  await db
    .batchInsert('corpus', lexWordArray, batchSize)
    .returning('id')
    .then(corpusIds => {
      const corpusIdToDictionaryId = corpusIds.map(corpusId => ({ corpus_id: corpusId, dictionary_id: dictionaryId }));
      console.log(corpusIdToDictionaryId);
      return db.batchInsert('corpus_dictionaries', corpusIdToDictionaryId, batchSize);
    });
};
