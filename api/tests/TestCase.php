<?php

namespace Tests;

use Illuminate\Foundation\Testing\TestCase as BaseTestCase;
use RuntimeException;

abstract class TestCase extends BaseTestCase
{
    /**
     * RefreshDatabase wipes every table on the configured connection. Container-level
     * DB_* variables override phpunit.xml, so refuse to boot unless the connection is
     * in-memory SQLite or a database whose name ends in _test.
     */
    public function createApplication()
    {
        $app = parent::createApplication();

        $config = $app['config'];
        $connection = $config->get('database.default');
        $driver = $config->get("database.connections.{$connection}.driver");
        $database = (string) $config->get("database.connections.{$connection}.database");

        $isolated = $driver === 'sqlite'
            ? ($database === ':memory:' || str_ends_with($database, '_test.sqlite'))
            : str_ends_with($database, '_test');

        if (! $isolated) {
            throw new RuntimeException(
                "Refusing to run tests against database [{$database}] ({$driver}). "
                .'Set DB_DATABASE to a *_test database (or use in-memory SQLite) before running the suite.'
            );
        }

        // Container env sets MAIL_MAILER=smtp; tests must never talk to a real mail server.
        $app['config']->set('mail.default', 'array');

        return $app;
    }
}
